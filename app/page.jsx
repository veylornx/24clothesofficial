"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, supabaseReady } from "../lib/supabase";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", size: "M", quantity: 1 });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadProducts() {
    if (!supabaseReady) return;
    const { data } = await supabase.from("products").select("*").eq("is_active", true).order("created_at", { ascending: false });
    setProducts(data || []);
  }

  useEffect(() => { loadProducts(); }, []);

  async function placeOrder(e) {
    e.preventDefault();
    if (!supabaseReady) return setMessage("Website setup is not complete yet. Please try again later.");
    if (!selected) return;
    setBusy(true);
    setMessage("");
    const { error } = await supabase.from("orders").insert({
      customer_name: form.name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      product_id: selected.id,
      product_name: selected.name,
      size: form.size,
      quantity: Number(form.quantity),
      status: "New"
    });
    setBusy(false);
    if (error) setMessage("Order could not be submitted. Please check your details and try again.");
    else {
      setMessage("Thank you! Your order has been received. We will contact you soon.");
      setSelected(null);
      setForm({ name: "", phone: "", address: "", size: "M", quantity: 1 });
    }
  }

  return (
    <main>
      <nav className="nav">
        <a className="brand" href="#">24C<span>.</span></a>
        <div className="navlinks"><a href="#collection">Collection</a><a href="#about">Our Story</a><a href="#contact">Contact</a></div>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">24C CLOTHING · EVERYDAY ESSENTIALS</p>
          <h1>Less, but<br/><em>better.</em></h1>
          <p className="hero-text">Timeless pieces. Thoughtful details. Everyday confidence.</p>
          <a className="button dark" href="#collection">Explore Collection</a>
        </div>
        <div className="hero-art">
          <div className="hero-art-inner">
            <span>THE EVERYDAY EDIT</span>
            <strong>24C</strong>
            <small>QUIETLY DISTINCTIVE</small>
          </div>
        </div>
      </section>

      <section className="intro" id="about">
        <p className="eyebrow">A DIFFERENT KIND OF EVERYDAY</p>
        <h2>Made to wear.<br/><em>Made to last.</em></h2>
        <p>We believe great style doesn't need to be loud. Discover considered essentials designed to become part of your everyday.</p>
      </section>

      <section className="collection section" id="collection">
        <div className="section-heading">
          <div><p className="eyebrow">CURATED FOR YOU</p><h2>Latest collection</h2></div>
          <span className="muted">01 — COLLECTION</span>
        </div>
        {!supabaseReady && <p className="notice">Connect your Supabase project to display products.</p>}
        {supabaseReady && products.length === 0 && <p className="notice">Our collection is being prepared. Please check back soon.</p>}
        <div className="products">
          {products.map((p) => (
            <article className="product" key={p.id}>
              <div className="product-image">
                {p.image_url ? <img src={p.image_url} alt={p.name}/> : <div className="image-placeholder">24C</div>}
                {p.tag && <span className="product-tag">{p.tag}</span>}
              </div>
              <div className="product-info"><div><h3>{p.name}</h3><p>{p.description || "Everyday essential"}</p></div><strong>৳{Number(p.price).toLocaleString("en-BD")}</strong></div>
              <button className="button outline full" onClick={() => { setSelected(p); setMessage(""); }}>Order Now</button>
            </article>
          ))}
        </div>
      </section>

      <section className="quote">
        <p className="eyebrow">THE 24C POINT OF VIEW</p>
        <h2>“Style is found<br/>in the <em>details.</em>”</h2>
      </section>

      <footer id="contact">
        <div><a className="brand light-brand" href="#">24C<span>.</span></a><p>Timeless essentials for everyday living.</p></div>
        <div className="footer-right"><p>For orders & enquiries</p><a href="mailto:24clothesofficial@gmail.com">24clothesofficial@gmail.com</a><p>© 2026 24C Clothing. All rights reserved.</p><Link href="/admin">Admin access</Link></div>
      </footer>

      {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}>
        <form className="order-modal" onSubmit={placeOrder} onClick={e => e.stopPropagation()}>
          <button type="button" className="close" onClick={() => setSelected(null)}>×</button>
          <p className="eyebrow">PLACE YOUR ORDER</p>
          <h2>{selected.name}</h2>
          <p className="modal-price">৳{Number(selected.price).toLocaleString("en-BD")}</p>
          <label>Your name<input required value={form.name} onChange={e => setForm({...form, name:e.target.value})} placeholder="Full name"/></label>
          <label>Phone number<input required type="tel" value={form.phone} onChange={e => setForm({...form, phone:e.target.value})} placeholder="01XXXXXXXXX"/></label>
          <label>Delivery address<textarea required value={form.address} onChange={e => setForm({...form, address:e.target.value})} placeholder="Your full address"/></label>
          <div className="form-row">
            <label>Size<select value={form.size} onChange={e => setForm({...form, size:e.target.value})}><option>S</option><option>M</option><option>L</option><option>XL</option><option>XXL</option></select></label>
            <label>Quantity<input type="number" min="1" max="20" value={form.quantity} onChange={e => setForm({...form, quantity:e.target.value})}/></label>
          </div>
          <button className="button dark full" disabled={busy}>{busy ? "Submitting..." : "Confirm Order"}</button>
          {message && <p className="form-message">{message}</p>}
          <small className="muted">We will contact you to confirm your order.</small>
        </form>
      </div>}
      {message && !selected && <div className="toast">{message}</div>}
    </main>
  );
}
