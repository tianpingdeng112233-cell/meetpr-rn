const http=require('http');
const userId='09300000-0000-4000-8000-000000000001';
const code='ABCD234567';
const message='我在用 MeetPR 给你排训练计划和看动作视频。\n1. 点这个链接安装 App：http://127.0.0.1:3093/i/ABCD234567\n2. 打开 App 注册账号\n3. 在「输入邀请码」页点「粘贴」，或输入：ABCD 234 567\n我这边确认后你就能看到训练计划了。—— 测试教练';
let role='coached_student';
http.createServer(async(req,res)=>{
 let data='';for await(const b of req)data+=b;
 const path=req.url.split('?')[0];
 console.log(req.method,path);
 const send=(v,s=200)=>{res.writeHead(s,{'content-type':'application/json'});res.end(JSON.stringify(v));};
 if(path==='/clipboard') {res.writeHead(200,{'content-type':'text/html;charset=utf-8'});res.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:20px sans-serif;padding:20px}button,textarea{font:18px sans-serif;width:100%;margin:12px 0;padding:12px;box-sizing:border-box}textarea{height:300px}</style><h3>Spec093 本机合成验证</h3><button onclick='navigator.clipboard.writeText(${JSON.stringify(message)})'>复制整段邀请消息</button><button onclick="navigator.clipboard.writeText('这是一段无关文字')">复制无关文字</button><textarea placeholder="长按此处粘贴，检查 App 实际复制内容"></textarea>`);return;}
 if(path==='/auth/email/login'){role=JSON.parse(data).email.startsWith('coach')?'coach':'coached_student';send({user:{id:userId,role,phone:null,email:null,name:'测试教练',created_at:'2026-10-17T00:00:00Z'},access_token:'local-fixture',refresh_token:'local-fixture'});return;}
 if(path==='/auth/refresh'){send({access_token:'local-fixture',refresh_token:'local-fixture'});return;}
 if(path==='/coach/invite-codes'){send({invite_codes:[{id:'09300000-0000-4000-8000-000000000002',coach_id:userId,code,type:'personal_permanent',used_count:0,created_at:'2026-10-17T00:00:00Z'}]});return;}
 if(path==='/bind-requests/mine'){send({bind_request:null});return;}
 if(path.endsWith('/onboarding')){send({error:'ONBOARDING_NOT_FOUND'},404);return;}
 if(path==='/coach/students'){send({students:[]});return;}
 if(path==='/coach/bind-requests'){send({bind_requests:[]});return;}
 if(path==='/events'||path==='/me/timezone'){send({});return;}
 send({error:'FIXTURE_UNIMPLEMENTED'},404);
}).listen(3093,'127.0.0.1',()=>console.log('Local-only fixture 3093'));
