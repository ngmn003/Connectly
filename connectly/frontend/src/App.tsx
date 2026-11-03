import { useEffect, useRef, useState } from "react";
import { MessageCircle, Plus, Search, Send, LogOut, Users, Radio } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
type User = {id:number; username:string; email:string};
type Conv = {id:number; title:string; is_group:boolean; members:User[]; last_message?:string};
type Msg = {id:number; conversation_id:number; sender:User; content:string; created_at:string};

export default function App() {
  const [token,setToken]=useState(localStorage.getItem("token")||"");
  const [me,setMe]=useState<User|null>(null);
  const [mode,setMode]=useState<"login"|"register">("login");
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [username,setUsername]=useState("");
  const [convs,setConvs]=useState<Conv[]>([]); const [active,setActive]=useState<Conv|null>(null);
  const [messages,setMessages]=useState<Msg[]>([]); const [draft,setDraft]=useState("");
  const [query,setQuery]=useState(""); const [users,setUsers]=useState<User[]>([]);
  const [showNew,setShowNew]=useState(false); const [group,setGroup]=useState(false); const [selected,setSelected]=useState<number[]>([]);
  const [error,setError]=useState(""); const ws=useRef<WebSocket|null>(null); const bottom=useRef<HTMLDivElement>(null);

  async function request(path:string, options:RequestInit={}) {
    const res=await fetch(API+path,{...options,headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`} : {}),...(options.headers||{})}});
    const data=await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.detail||"Request failed");
    return data;
  }
  async function authenticate(e:React.FormEvent) {
    e.preventDefault(); setError("");
    try {
      const data=await request(`/auth/${mode}`,{method:"POST",body:JSON.stringify(mode==="login"?{email,password}:{username,email,password})});
      localStorage.setItem("token",data.access_token); setToken(data.access_token); setMe(data.user);
    } catch(err:any){setError(err.message);}
  }
  function logout(){localStorage.removeItem("token");setToken("");setMe(null);setActive(null);ws.current?.close();}
  async function load() {
    try { const [u,c]=await Promise.all([request("/users/me"),request("/conversations")]); setMe(u); setConvs(c); }
    catch {logout();}
  }
  useEffect(()=>{if(token) load();},[token]);
  useEffect(()=>{
    if(!token)return;
    const socket=new WebSocket(`${API.replace(/^http/,"ws")}/ws?token=${encodeURIComponent(token)}`); ws.current=socket;
    socket.onmessage=(event)=>{const data=JSON.parse(event.data); if(data.type==="new_message"){const m=data.message as Msg; if(active?.id===m.conversation_id)setMessages(prev=>prev.some(x=>x.id===m.id)?prev:[...prev,m]); setConvs(prev=>prev.map(c=>c.id===m.conversation_id?{...c,last_message:m.content}:c).sort((a,b)=>(a.id===m.conversation_id?-1:0)));}};
    socket.onclose=()=>{}; return ()=>socket.close();
  },[token,active?.id]);
  async function openConversation(c:Conv){setActive(c);try{setMessages(await request(`/conversations/${c.id}/messages`));}catch(e:any){setError(e.message);}}
  useEffect(()=>{bottom.current?.scrollIntoView({behavior:"smooth"});},[messages]);
  async function send(e:React.FormEvent){e.preventDefault();if(!draft.trim()||!active)return;const text=draft.trim();setDraft("");try{const m=await request(`/conversations/${active.id}/messages`,{method:"POST",body:JSON.stringify({content:text})});setMessages(prev=>prev.some(x=>x.id===m.id)?prev:[...prev,m]);setConvs(await request("/conversations"));}catch(err:any){setError(err.message);setDraft(text);}}
  async function search(q:string){setQuery(q);try{setUsers(await request(`/users?q=${encodeURIComponent(q)}`));}catch{}}
  async function createChat(){try{const c=await request("/conversations",{method:"POST",body:JSON.stringify({member_ids:selected,title:group?"New group":"Chat"})});const list=await request("/conversations");setConvs(list);setShowNew(false);setSelected([]);setGroup(false);openConversation(c);}catch(e:any){setError(e.message);}}
  if(!token||!me) return <div className="auth-wrap"><form className="auth-card" onSubmit={authenticate}><div className="brand"><span className="brand-icon"><MessageCircle/></span><span>connectly</span></div><p className="muted">Good conversations start here.</p><h1>{mode==="login"?"Welcome back":"Create your account"}</h1>{mode==="register"&&<label>Username<input value={username} onChange={e=>setUsername(e.target.value)} placeholder="yourname" required minLength={3}/></label>}<label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters" required minLength={8}/></label>{error&&<div className="error">{error}</div>}<button className="primary full">{mode==="login"?"Sign in":"Create account"}</button><p className="switch">{mode==="login"?"New to Connectly?":"Already have an account?"} <button type="button" onClick={()=>{setMode(mode==="login"?"register":"login");setError("");}}>{mode==="login"?"Create account":"Sign in"}</button></p></form></div>;
  return <div className="app-shell">
    <aside className="sidebar"><div className="side-brand"><span className="brand-icon"><MessageCircle/></span><b>connectly</b><button className="icon-btn" onClick={()=>setShowNew(true)} title="New chat"><Plus/></button></div>
      <div className="me-card"><div className="avatar">{me.username[0].toUpperCase()}</div><div><b>{me.username}</b><small><i className="online-dot"/> Active now</small></div><button className="icon-btn logout" onClick={logout} title="Sign out"><LogOut/></button></div>
      <div className="section-label">MESSAGES <span>{convs.length}</span></div>
      <div className="conversation-list">{convs.map(c=><button key={c.id} className={`conversation ${active?.id===c.id?"selected":""}`} onClick={()=>openConversation(c)}><div className="avatar convo-avatar">{c.is_group?<Users/>:(c.title[0]||"C").toUpperCase()}</div><div className="convo-copy"><b>{c.title}</b><small>{c.last_message||"Start a conversation"}</small></div></button>)}{!convs.length&&<p className="empty-hint">No conversations yet. Start one!</p>}</div>
      <button className="new-chat" onClick={()=>setShowNew(true)}><Plus size={17}/> New conversation</button>
    </aside>
    <main className="chat-area">{active?<><header className="chat-header"><div className="avatar">{active.is_group?<Users/>:active.title[0]?.toUpperCase()}</div><div><b>{active.title}</b><small>{active.members.length} {active.members.length===1?"member":"members"}</small></div><div className="header-status"><Radio size={15}/> Live chat</div></header><div className="messages">{messages.map(m=><div key={m.id} className={`message-row ${m.sender.id===me.id?"mine":""}`}><div className="message"><small>{m.sender.id===me.id?"You":m.sender.username}</small><p>{m.content}</p><time>{new Date(m.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</time></div></div>)}{!messages.length&&<div className="welcome"><div className="welcome-icon"><MessageCircle/></div><h2>Say hello 👋</h2><p>This is the beginning of your conversation.</p></div>}<div ref={bottom}/></div><form className="composer" onSubmit={send}><input value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Write a message..." maxLength={5000}/><button className="send-btn" disabled={!draft.trim()}><Send size={18}/></button></form></>:<div className="welcome"><div className="welcome-icon"><MessageCircle/></div><h2>Your space to connect.</h2><p>Select a conversation or start a new one.</p><button className="primary" onClick={()=>setShowNew(true)}><Plus size={17}/> Start chatting</button></div>}</main>
    {error&&<div className="toast" onClick={()=>setError("")}>{error} ×</div>}
    {showNew&&<div className="modal-backdrop" onClick={()=>setShowNew(false)}><div className="modal" onClick={e=>e.stopPropagation()}><div className="modal-head"><div><h2>New conversation</h2><p>Find people to start chatting with.</p></div><button className="icon-btn" onClick={()=>setShowNew(false)}>×</button></div><div className="search-box"><Search size={17}/><input placeholder="Search by username or email" value={query} onChange={e=>search(e.target.value)}/></div><label className="group-toggle"><input type="checkbox" checked={group} onChange={e=>setGroup(e.target.checked)}/> Create a group conversation</label><div className="user-results">{users.map(u=><button key={u.id} className="user-result" onClick={()=>setSelected(prev=>prev.includes(u.id)?prev.filter(x=>x!==u.id):group?[...prev,u.id]:[u.id])}><div className="avatar">{u.username[0].toUpperCase()}</div><span><b>{u.username}</b><small>{u.email}</small></span><input type="checkbox" readOnly checked={selected.includes(u.id)}/></button>)}</div><button className="primary full" disabled={!selected.length} onClick={createChat}>{group?"Create group":"Start conversation"}{selected.length>0?` (${selected.length})`:""}</button></div></div>}
  </div>;
}
