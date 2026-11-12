"use client";

import { useEffect, useState } from "react";
import { supabase, supabaseReady } from "../../lib/supabase";

export default function AdminPage() {
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [product, setProduct] = useState({ name:"", price:"", description:"", image_url:"", tag:"" });

  async function checkAccess(currentSession) {
    if (!currentSession?.user) { setSession(null); setIsAdmin(false); setLoading(false); return; }
    setSession(currentSession);
    const { data } = await supabase.from("admins").select("id").eq("id", currentSession.user.id).maybeSingle();
    setIsAdmin(Boolean(data));
    setLoading(false);
    if (data) loadDashboard();
  }

  async function loadDashboard() {
    const [{ data: p }, { data: o }] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending:false }),
      supabase.from("orders").select("*").order("created_at", { ascending:false })
    ]);
    setProducts(p || []);
    setOrders(o || []);
  }

  useEffect(() => {
    if (!supabaseReady) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => checkAccess(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      checkAccess(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function authenticate(e) {
    e.preventDefault(); setMessage(""); setLoading(true);
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (result.error) setMessage(result.error.message);
    else if (mode === "signup") setMessage("Account created. Verify your email if requested. Then ask the project owner to add your User ID to the admins table in Supabase.");
    else if (result.data.session) await checkAccess(result.data.session);
    else setMessage("Check your email to confirm your account, then log in.");
  }

  async function addProduct(e) {
    e.preventDefault(); setMessage("");
    const { error } = await supabase.from("products").insert({ ...product, price:Number(product.price), is_active:true });
    if (error) setMessage(error.message);
    else { setProduct({ name:"", price:"", description:"", image_url:"", tag:"" }); setMessage("Product added."); loadDashboard(); }
  }

  async function deleteProduct(id) {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    setMessage(error ? error.message : "Product deleted.");
    loadDashboard();
  }

  async function updateOrder(id, status) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) setMessage(error.message); else loadDashboard();
  }

  if (!supabaseReady) return <main className="admin-shell"><div className="admin-card"><a className="brand" href="/">24C<span>.</span></a><h1>Setup required</h1><p>Add your Supabase URL and publishable/anon key in Vercel Environment Variables first.</p></div></main>;
  if (loading) return <main className="admin-shell"><p>Loading admin...</p></main>;

  if (!session) return <main className="admin-shell"><form className="admin-card" onSubmit={authenticate}>
    <a className="brand" href="/">24C<span>.</span></a><p className="eyebrow">PRIVATE ACCESS</p><h1>{mode === "login" ? "Admin login" : "Create account"}</h1>
    <p className="muted">Sign in with your authorized admin email.</p>
    <label>Email address<input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/></label>
    <label>Password<input type="password" minLength="8" required value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters"/></label>
    <button className="button dark full" disabled={loading}>{mode === "login" ? "Login" : "Create account"}</button>
    <button type="button" className="text-button" onClick={() => {setMode(mode === "login" ? "signup" : "login");setMessage("");}}>{mode === "login" ? "Create the first account" : "Back to login"}</button>
    {message && <p className="form-message">{message}</p>}
    <a className="back-link" href="/">← Back to website</a>
  </form></main>;

  if (!isAdmin) return <main className="admin-shell"><div className="admin-card"><a className="brand" href="/">24C<span>.</span></a><h1>Access not approved</h1><p>Your account is signed in, but it is not registered as an administrator. Add this user's ID to the admins table in Supabase.</p><code className="user-id">{session.user.id}</code><button className="button dark full" onClick={() => supabase.auth.signOut()}>Sign out</button></div></main>;

  return <main className="dashboard">
    <aside className="sidebar"><a className="brand" href="/">24C<span>.</span></a><p className="eyebrow">STORE MANAGEMENT</p><a href="#overview">Overview</a><a href="#products">Products</a><a href="#orders">Orders</a><button className="side-logout" onClick={() => supabase.auth.signOut()}>Sign out</button></aside>
    <section className="dash-main">
      <header className="dash-header"><div><p className="eyebrow">WELCOME BACK</p><h1>Dashboard</h1></div><span className="admin-email">{session.user.email}</span></header>
      <div className="stats" id="overview"><div><span>Total products</span><strong>{products.length}</strong></div><div><span>Total orders</span><strong>{orders.length}</strong></div><div><span>New orders</span><strong>{orders.filter(o=>o.status==="New").length}</strong></div></div>
      {message && <p className="notice">{message}</p>}
      <section className="dash-section" id="products"><div className="section-heading"><div><p className="eyebrow">YOUR CATALOGUE</p><h2>Manage products</h2></div></div>
        <form className="product-form" onSubmit={addProduct}><h3>Add a new product</h3><div className="form-row"><label>Product name<input required value={product.name} onChange={e=>setProduct({...product,name:e.target.value})}/></label><label>Price (BDT)<input required type="number" min="0" value={product.price} onChange={e=>setProduct({...product,price:e.target.value})}/></label></div><label>Description<input value={product.description} onChange={e=>setProduct({...product,description:e.target.value})}/></label><label>Image URL<input type="url" value={product.image_url} onChange={e=>setProduct({...product,image_url:e.target.value})} placeholder="https://..."/></label><label>Tag (optional)<input value={product.tag} onChange={e=>setProduct({...product,tag:e.target.value})} placeholder="NEW ARRIVAL"/></label><button className="button dark">Add product</button></form>
        <div className="admin-list">{products.map(p=><div className="admin-list-row" key={p.id}><div>{p.image_url ? <img src={p.image_url} alt=""/> : <div className="mini-placeholder">24C</div>}<div><strong>{p.name}</strong><small>৳{p.price}</small></div></div><button className="delete-button" onClick={()=>deleteProduct(p.id)}>Delete</button></div>)}</div>
      </section>
      <section className="dash-section" id="orders"><div className="section-heading"><div><p className="eyebrow">CUSTOMER ACTIVITY</p><h2>Recent orders</h2></div></div>
        {orders.length===0 ? <p className="muted">No orders yet.</p> : <div className="orders-list">{orders.map(o=><article className="order-card" key={o.id}><div><strong>{o.customer_name}</strong><p>{o.product_name} · {o.size} · Qty {o.quantity}</p><p>{o.phone} · {o.address}</p><small>{new Date(o.created_at).toLocaleString()}</small></div><select value={o.status} onChange={e=>updateOrder(o.id,e.target.value)}><option>New</option><option>Confirmed</option><option>Shipped</option><option>Delivered</option><option>Cancelled</option></select></article>)}</div>}
      </section>
    </section>
  </main>;
}
