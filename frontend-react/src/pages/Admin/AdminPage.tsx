import { useEffect, useState } from 'react';
import { fetchImports, runImport, type ImportJob } from '../../entities/imports/api';
import { fetchAudit, type AuditRow } from '../../entities/audit/api';
import { api } from '../../shared/api';

const card:React.CSSProperties={background:'#fff',border:'1px solid #e5e7eb',borderRadius:20,padding:20,boxShadow:'0 10px 30px rgba(15,23,42,.06)'};
const badge=(status:string):React.CSSProperties=>({display:'inline-flex',padding:'6px 10px',borderRadius:999,color:status==='completed'?'#166534':status==='running'?'#92400e':'#991b1b',background:status==='completed'?'#dcfce7':status==='running'?'#fef3c7':'#fee2e2',fontWeight:700,fontSize:12});

type DashboardStats = {
  drugsCount?: number;
  substancesCount?: number;
  synonymsCount?: number;
  interactionsCount?: number;
  highInteractionsCount?: number;
  grlsCoverage?: number;
  updatedAt?: string;
};

export function AdminPage(){
  const [imports,setImports]=useState<ImportJob[]>([]);
  const [audit,setAudit]=useState<AuditRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [source,setSource]=useState('manual_demo_job');
  const [message,setMessage]=useState('');
  const [stats,setStats]=useState<DashboardStats>({});
  const [statsError,setStatsError]=useState(false);

  useEffect(()=>{
    Promise.all([
      fetchImports(),
      fetchAudit(),
      api.get('/dashboard').then(r=>r.data).catch(()=>null)
    ]).then(([i,a,d])=>{
      setImports(i);
      setAudit(a);
      if(d){ setStats(d); } else { setStatsError(true); }
      setLoading(false);
    });
  },[]);

  const handleRun=async()=>{ const res=await runImport(source); setMessage(res.message); setImports(prev=>[res.job,...prev]); };

  const kpiCards=[
    ['Препаратов в базе', stats.drugsCount!=null?stats.drugsCount.toLocaleString('ru'):'—', statsError?'Нет данных':loading?'Загрузка...':''],
    ['Действующих веществ', stats.substancesCount!=null?stats.substancesCount.toLocaleString('ru'):'—', stats.synonymsCount!=null?`Синонимов: ${stats.synonymsCount.toLocaleString('ru')}`:statsError?'Нет данных':loading?'Загрузка...':''],
    ['Взаимодействий в графе', stats.interactionsCount!=null?stats.interactionsCount.toLocaleString('ru'):'—', stats.highInteractionsCount!=null?`HIGH: ${stats.highInteractionsCount.toLocaleString('ru')}`:statsError?'Нет данных':loading?'Загрузка...':''],
    ['Покрытие ГРЛС', stats.grlsCoverage!=null?`${stats.grlsCoverage}%`:'—', stats.updatedAt?`Обновлено: ${stats.updatedAt}`:statsError?'Нет данных':loading?'Загрузка...':''],
  ];

  return <div style={{display:'grid',gap:20}}>
    <section style={{display:'grid',gridTemplateColumns:'repeat(4, minmax(0,1fr))',gap:16}}>
      {kpiCards.map(([title,value,note])=><div key={title} style={card}><div style={{color:'#6b7280',fontSize:14,marginBottom:10}}>{title}</div><div style={{fontSize:34,fontWeight:800,marginBottom:8}}>{value}</div><div style={{color:'#059669',fontSize:14}}>{note}</div></div>)}
    </section>
    <section style={{display:'grid',gridTemplateColumns:'1.2fr .8fr',gap:20}}>
      <div style={card}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}><h2 style={{margin:0}}>ETL-импорт</h2><span style={{color:'#6b7280'}}>Состояние источников</span></div>
        <div style={{display:'flex',gap:12,marginBottom:16}}><input value={source} onChange={e=>setSource(e.target.value)} placeholder='Имя источника' style={{flex:1,padding:'12px 14px',border:'1px solid #d1d5db',borderRadius:12}} /><button onClick={handleRun} style={{background:'#0f766e',color:'#fff',border:'none',borderRadius:12,padding:'12px 16px',fontWeight:700}}>Запуск ETL</button></div>
        {message && <div style={{marginBottom:12,color:'#0f766e',fontWeight:600}}>{message}</div>}
        <div style={{overflow:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr>{['ID','Источник','Статус','Обработано','Ошибок','Время'].map(h=><th key={h} style={{textAlign:'left',padding:'12px 8px',borderBottom:'1px solid #e5e7eb',color:'#6b7280',fontSize:13}}>{h}</th>)}</tr></thead><tbody>{imports.map(row=><tr key={row.id}><td style={{padding:'12px 8px',borderBottom:'1px solid #f3f4f6'}}>{row.id}</td><td style={{padding:'12px 8px',borderBottom:'1px solid #f3f4f6'}}>{row.source}</td><td style={{padding:'12px 8px',borderBottom:'1px solid #f3f4f6'}}><span style={badge(row.status)}>{row.status}</span></td><td style={{padding:'12px 8px',borderBottom:'1px solid #f3f4f6'}}>{row.recordsProcessed}</td><td style={{padding:'12px 8px',borderBottom:'1px solid #f3f4f6'}}>{row.recordsFailed}</td><td style={{padding:'12px 8px',borderBottom:'1px solid #f3f4f6'}}>{row.startedAt}</td></tr>)}</tbody></table></div>
      </div>
      <div style={{...card,display:'grid',gap:16,alignContent:'start'}}>
        <div><h2 style={{margin:'0 0 8px'}}>Последние запросы</h2><div style={{color:'#6b7280'}}>Данные в стилистике референса</div></div>
        {['Аспирин','Метформин','Лизиноприл'].map((x,i)=><div key={x} style={{padding:14,border:'1px solid #e5e7eb',borderRadius:16}}><div style={{fontWeight:700}}>{x}</div><div style={{color:'#6b7280'}}>{['Ацетилсалициловая кислота · C01EB02','Метформина гидрохлорид · A10BA02','Лизиноприл · C09AA03'][i]}</div></div>)}
        {statsError && <div style={{padding:16,borderRadius:16,background:'#fef2f2',color:'#991b1b'}}>Не удалось загрузить данные с backend API. Проверьте подключение.</div>}
      </div>
    </section>
    <section style={card}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}><h2 style={{margin:0}}>Журнал аудита</h2><span style={{color:'#6b7280'}}>Только для администратора</span></div>
      <div style={{overflow:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr>{['Время','Пользователь','Действие','Сущность','IP'].map(h=><th key={h} style={{textAlign:'left',padding:'12px 8px',borderBottom:'1px solid #e5e7eb',color:'#6b7280',fontSize:13}}>{h}</th>)}</tr></thead><tbody>{audit.map((row,idx)=><tr key={idx}><td style={{padding:'12px 8px',borderBottom:'1px solid #f3f4f6'}}>{row.time}</td><td style={{padding:'12px 8px',borderBottom:'1px solid #f3f4f6'}}>{row.user}</td><td style={{padding:'12px 8px',borderBottom:'1px solid #f3f4f6'}}>{row.action}</td><td style={{padding:'12px 8px',borderBottom:'1px solid #f3f4f6'}}>{row.entity}</td><td style={{padding:'12px 8px',borderBottom:'1px solid #f3f4f6'}}>{row.ip}</td></tr>)}</tbody></table></div>
    </section>
  </div>;
}
