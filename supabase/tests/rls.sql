begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(26);
insert into auth.users(id,email) values ('a0000000-0000-4000-8000-000000000001','rls-a@example.test'),('b0000000-0000-4000-8000-000000000001','rls-b@example.test');
insert into public.shops(id,owner_id,name,slug,whatsapp) values
('a0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000001','Shop A','rls-shop-a','77011111111'),
('b0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000001','Shop B','rls-shop-b','77022222222');
insert into public.products(id,shop_id,title,price,in_stock) values
('a0000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000002','A',100,true),
('b0000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000002','B',200,true),
('a0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000002','Sold out',100,false);
insert into public.ai_generations(shop_id) values('b0000000-0000-4000-8000-000000000002');
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select is((select count(*)::integer from public.shops where slug like 'rls-shop-%'),2,'anonymous reads storefronts');
select is((select count(*)::integer from public.products where title in ('A','B','Sold out')),3,'anonymous reads products');
select is((select count(*)::integer from public.orders),0,'anonymous cannot read orders');
select is((select count(*)::integer from public.events),0,'anonymous cannot read events');
select is((select count(*)::integer from public.ai_generations),0,'anonymous cannot read AI usage');
select throws_like($$insert into public.orders(number,shop_id,items,total,customer_name,customer_phone) values(1,'a0000000-0000-4000-8000-000000000002','[]',0,'x','77011111111')$$,'%row-level security%','direct order insert denied');
select lives_ok($$select public.create_order('b0000000-0000-4000-8000-000000000002','[{"id":"b0000000-0000-4000-8000-000000000003","qty":2}]','Buyer','77033333333','','')$$,'anonymous RPC works');
select throws_like($$select public.create_order('a0000000-0000-4000-8000-000000000002','[]','Buyer','77033333333','','')$$,'%invalid items%','empty cart rejected');
select throws_like($$select public.create_order('a0000000-0000-4000-8000-000000000002','[{"id":"a0000000-0000-4000-8000-000000000003","qty":100}]','Buyer','77033333333','','')$$,'%invalid quantity%','quantity over 99 rejected');
select throws_like($$select public.create_order('a0000000-0000-4000-8000-000000000002','[{"id":"a0000000-0000-4000-8000-000000000003","qty":0}]','Buyer','77033333333','','')$$,'%invalid quantity%','zero quantity rejected');
select throws_like($$select public.create_order('a0000000-0000-4000-8000-000000000002','[{"id":"b0000000-0000-4000-8000-000000000003","qty":1}]','Buyer','77033333333','','')$$,'%items unavailable%','foreign product rejected');
select throws_like($$select public.create_order('a0000000-0000-4000-8000-000000000002','[{"id":"a0000000-0000-4000-8000-000000000004","qty":1}]','Buyer','77033333333','','')$$,'%items unavailable%','sold out rejected');
select throws_like($$select public.create_order('a0000000-0000-4000-8000-000000000002','[{"id":"a0000000-0000-4000-8000-000000000003","qty":1}]','Buyer','bad','','')$$,'%invalid phone%','bad phone rejected');
select throws_like($$insert into public.events(shop_id,type) values('a0000000-0000-4000-8000-000000000002','view')$$,'%row-level security%','direct events denied');
reset role;
select is((select total from public.orders where shop_id='b0000000-0000-4000-8000-000000000002'),400,'server computes total');
select is((select number::integer from public.orders where shop_id='b0000000-0000-4000-8000-000000000002'),1,'new shop starts at one');
set local role authenticated;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',true);
select is((select count(*)::integer from public.orders where shop_id='b0000000-0000-4000-8000-000000000002'),0,'A cannot read B orders');
with changed as (update public.shops set name='hacked' where id='b0000000-0000-4000-8000-000000000002' returning id) select is(count(*)::integer,0,'A cannot update B shop') from changed;
with changed as (update public.products set price=1 where id='b0000000-0000-4000-8000-000000000003' returning id) select is(count(*)::integer,0,'A cannot update B product') from changed;
select throws_like($$insert into storage.objects(bucket_id,name) values('product-photos','b0000000-0000-4000-8000-000000000001/hacked.jpg')$$,'%row-level security%','A cannot upload into B folder');
select throws_like($$update public.shops set slug='changed' where id='a0000000-0000-4000-8000-000000000002'$$,'%permission denied%','slug immutable through API');
select lives_ok($$select public.record_view('a0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000005')$$,'owner view ignored');
reset role;
select is((select count(*)::integer from public.events where shop_id='a0000000-0000-4000-8000-000000000002'),0,'owner did not increase views');
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$begin for i in 1..20 loop perform public.record_view('a0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000005'); end loop; end $$;
select throws_like($$select public.record_view('a0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000005')$$,'%rate limit%','view quota enforced');
do $$begin for i in 1..10 loop perform public.create_order('a0000000-0000-4000-8000-000000000002','[{"id":"a0000000-0000-4000-8000-000000000003","qty":1}]','Buyer','77044444444','',''); end loop; end $$;
select throws_like($$select public.create_order('a0000000-0000-4000-8000-000000000002','[{"id":"a0000000-0000-4000-8000-000000000003","qty":1}]','Buyer','77044444444','','')$$,'%rate limit%','order quota enforced');
reset role;
insert into public.products(shop_id,title,price) select 'a0000000-0000-4000-8000-000000000002','Extra '||n,1 from generate_series(1,13) n;
select throws_like($$insert into public.products(shop_id,title,price) values('a0000000-0000-4000-8000-000000000002','Sixteenth',1)$$,'%free product limit%','SQL enforces 15 products');
select * from finish();
rollback;
