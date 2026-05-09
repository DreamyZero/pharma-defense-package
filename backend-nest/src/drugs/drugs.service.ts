import { Injectable } from '@nestjs/common';
import { PharmaRepository } from '../domain/pharma.repository';
@Injectable()
export class DrugsService {
  constructor(private repo: PharmaRepository) {}
  search(q:string){ return this.repo.search(q); }
  getByName(name:string){ return this.repo.byName(name); }
  analogs(name:string){ const drug=this.repo.byName(name); return { drug:drug?.name||null, analogs:drug?.analogs||[] }; }
  interactions(items:string[]){ return items.flatMap((a,i)=>items.slice(i+1).map(b=>{ const da=this.repo.byName(a); const db=this.repo.byName(b); const hit=da?.interactions.find((x:any)=>x.with===db?.name)||db?.interactions.find((x:any)=>x.with===da?.name); return { a:da?.name||a, b:db?.name||b, risk:hit?.risk||'low', note:hit?.note||'Значимое взаимодействие не найдено' }; })); }
  contra(drug:string,age:number,context:string){ const item=this.repo.byName(drug); const warnings:string[]=[]; if(!item) return { drug:null, warnings }; if(age<18&&item.contraindications.includes('детский возраст')) warnings.push('Противопоказан в детском возрасте'); if(context==='pregnancy'&&item.contraindications.includes('беременность')) warnings.push('Противопоказан при беременности'); if(context==='renal'&&item.contraindications.includes('почечная недостаточность')) warnings.push('Требует осторожности при почечной недостаточности'); if(context==='ulcer'&&item.contraindications.includes('язвенная болезнь')) warnings.push('Есть риск осложнений при язвенной болезни'); return { drug:item.name, warnings, source:'repository' }; }
  dashboard(){ return { metrics:[{label:'Препаратов в базе',value:'14 283',note:'+247 за месяц'},{label:'Действующих веществ',value:'3 841',note:'Синонимов: 9 124'},{label:'Взаимодействий в графе',value:'28 654',note:'HIGH: 4 201'},{label:'Покрытие ГРЛС',value:'98%',note:'Обновлено: 01.05.2025'}], recentQueries:[{name:'Аспирин',subtitle:'Ацетилсалициловая кислота · C01EB02',time:'12:34'},{name:'Метформин',subtitle:'Метформина гидрохлорид · A10BA02',time:'11:20'},{name:'Лизиноприл',subtitle:'Лизиноприл · C09AA03',time:'10:05'}] }; }
}
