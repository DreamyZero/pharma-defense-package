import { Injectable } from '@nestjs/common';
import { drugs } from './pharma.data';
@Injectable()
export class PharmaRepository {
  private norm(v:string){ return v.trim().toLowerCase(); }
  all(){ return drugs; }
  search(q:string){ const n=this.norm(q); return drugs.filter(d=>this.norm(d.name).includes(n)||this.norm(d.substance).includes(n)||d.indications.some(i=>this.norm(i).includes(n))||d.synonyms.some(s=>this.norm(s).includes(n))||this.norm(d.group).includes(n)); }
  byName(name:string){ const n=this.norm(name); return drugs.find(d=>this.norm(d.name)===n||this.norm(d.substance)===n||d.synonyms.some(s=>this.norm(s)===n)); }
}
