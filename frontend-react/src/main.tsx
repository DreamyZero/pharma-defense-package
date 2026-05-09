import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import { AdminPage } from './pages/Admin/AdminPage';
function App(){
  return <BrowserRouter><div style={{display:'grid',gridTemplateColumns:'240px 1fr',minHeight:'100vh'}}><aside style={{background:'#0f172a',color:'#fff',padding:24}}><h2 style={{margin:'0 0 24px'}}>Pharma Admin</h2><nav style={{display:'grid',gap:12}}><NavLink style={({isActive})=>({color:'#fff',textDecoration:'none',opacity:isActive?1:.75})} to="/">Администрирование</NavLink></nav></aside><main style={{padding:24}}><Routes><Route path="/" element={<AdminPage/>} /></Routes></main></div></BrowserRouter>
}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
