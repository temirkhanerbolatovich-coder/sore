begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(44);
insert into auth.users(id,email) values ('a0000000-0000-4000-8000-000000000001','rls-a@example.test'),('b0000000-0000-4000-8000-000000000001','rls-b@example.test');
insert into public.shops(id,owner_id,name,slug,whatsapp) values
('a0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000001','Shop A','rls-shop-a','77011111111'),
('b0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000001','Shop B','rls-shop-b','77022222222');
insert into public.products(id,shop_id,title,price,in_stock) values
('a0000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000002','A',100,true),
('b0000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000002','B',200,true),
('a0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000002','Sold out',100,false);
insert into public.products(id,shop_id,title,price,price_mode) values
('a0000000-0000-4000-8000-000000000006','a0000000-0000-4000-8000-000000000002','Ask me',0,'request'),
('a0000000-0000-4000-8000-000000000007','a0000000-0000-4000-8000-000000000002','From price',15000,'from');
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
select throws_like($$select public.create_order('a0000000-0000-4000-8000-000000000002','[{"id":"a0000000-0000-4000-8000-000000000006","qty":1}]','Buyer','77033333333','','')$$,'%items unavailable%','price on request cannot be ordered');
select throws_like($$select public.create_order('a0000000-0000-4000-8000-000000000002','[{"id":"a0000000-0000-4000-8000-000000000007","qty":1}]','Buyer','77033333333','','')$$,'%items unavailable%','from-price item cannot be ordered');
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
select lives_ok($test$
  do $body$ begin
    for i in 1..20 loop
      perform public.create_order('a0000000-0000-4000-8000-000000000002',
        '[{"id":"a0000000-0000-4000-8000-000000000003","qty":1}]', 'Buyer', '7704000' || lpad(i::text, 4, '0'), '', '');
    end loop;
  end; $body$
$test$, 'shop accepts 30 orders in the hour');
select throws_like($$select public.create_order('a0000000-0000-4000-8000-000000000002','[{"id":"a0000000-0000-4000-8000-000000000003","qty":1}]','Buyer','77040000021','','')$$,'%rate limit exceeded%','shop rejects order 31 even with a fresh phone');
select lives_ok($$select public.create_order('b0000000-0000-4000-8000-000000000002','[{"id":"b0000000-0000-4000-8000-000000000003","qty":1}]','Buyer','77040000021','','')$$,'shop quota does not affect other shops');
select lives_ok($$select public.record_inquiry('a0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000006','a0000000-0000-4000-8000-000000000008')$$,'inquiry about a price-on-request item is recorded');
select throws_like($$select public.record_inquiry('a0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000008')$$,'%product unavailable%','inquiry rejected for a fixed-price item');
reset role;
insert into public.products(shop_id,title,price) select 'a0000000-0000-4000-8000-000000000002','Extra '||n,1 from generate_series(1,11) n;
select throws_like($$insert into public.products(shop_id,title,price) values('a0000000-0000-4000-8000-000000000002','Sixteenth',1)$$,'%free product limit%','SQL enforces 15 products');

-- Варианты, дата заказа и Telegram
reset role;
insert into public.products(id,shop_id,title,price,variants) values
('b0000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000002','Cake',1,'[{"id":"k1","title":"1 кг","price":100},{"id":"k2","title":"2 кг","price":180}]');
select is((select price from public.products where id='b0000000-0000-4000-8000-000000000004'),100,'base price follows the cheapest variant');
select throws_like($$insert into public.products(shop_id,title,price,variants) values('b0000000-0000-4000-8000-000000000002','Bad',1,'[{"id":"x","title":"t","price":0}]')$$,'%violates check constraint%','invalid variant price rejected');
select throws_like($$insert into public.products(shop_id,title,price,price_mode,variants) values('b0000000-0000-4000-8000-000000000002','Bad2',0,'request','[{"id":"x","title":"t","price":5}]')$$,'%products_variants_price_mode%','variants are not allowed with price on request');
update public.shops set lead_days = 2 where id='b0000000-0000-4000-8000-000000000002';
insert into public.shop_telegram(shop_id,link_code,chat_id) values ('a0000000-0000-4000-8000-000000000002','CODEA',111),('b0000000-0000-4000-8000-000000000002','CODEB',222);
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select is((select order_total from public.create_order('b0000000-0000-4000-8000-000000000002','[{"id":"b0000000-0000-4000-8000-000000000004","qty":1,"variant":"k2"}]','Buyer','77055555555','','',(now() at time zone 'Asia/Almaty')::date + 5,'18:00')),180,'variant price is charged');
select throws_like($$select public.create_order('b0000000-0000-4000-8000-000000000002','[{"id":"b0000000-0000-4000-8000-000000000004","qty":1}]','Buyer','77055555555','','',(now() at time zone 'Asia/Almaty')::date + 5,null)$$,'%items unavailable%','variant is required when the product has variants');
select throws_like($$select public.create_order('b0000000-0000-4000-8000-000000000002','[{"id":"b0000000-0000-4000-8000-000000000004","qty":1,"variant":"zz"}]','Buyer','77055555555','','',(now() at time zone 'Asia/Almaty')::date + 5,null)$$,'%items unavailable%','unknown variant rejected');
select throws_like($$select public.create_order('b0000000-0000-4000-8000-000000000002','[{"id":"b0000000-0000-4000-8000-000000000003","qty":1,"variant":"k1"}]','Buyer','77055555555','','',(now() at time zone 'Asia/Almaty')::date + 5,null)$$,'%items unavailable%','variant on a product without variants rejected');
select throws_like($$select public.create_order('b0000000-0000-4000-8000-000000000002','[{"id":"b0000000-0000-4000-8000-000000000003","qty":1}]','Buyer','77055555555','','')$$,'%date required%','date is required when the shop needs lead time');
select throws_like($$select public.create_order('b0000000-0000-4000-8000-000000000002','[{"id":"b0000000-0000-4000-8000-000000000003","qty":1}]','Buyer','77055555555','','',(now() at time zone 'Asia/Almaty')::date,null)$$,'%date too early%','date inside the lead time rejected');
select throws_like($$select count(*) from public.shop_telegram$$,'%permission denied%','anonymous cannot read Telegram links');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',true);
select is((select count(*)::integer from public.shop_telegram),1,'owner sees only own Telegram link status');
reset role;
select * from finish();
rollback;
