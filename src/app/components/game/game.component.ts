import {
  Component, AfterViewInit, OnDestroy, ViewChild, ElementRef,
  Input, Output, EventEmitter, NgZone
} from '@angular/core';
import { AccountantType } from '../../models/game.models';

const CW = 800, CH = 450, GROUND_TOP = 372;
const GRAVITY = 1400, JUMP_VEL = -630, BASE_SCROLL = 175;
const COMPLIANCE_DRAIN = 7, PLAYER_X = 130, PLAYER_W = 26, PLAYER_H = 38;
const PROJ_SPEED = 560, PROJ_W = 16, PROJ_H = 9;

type EKind = 'laptop' | 'filing_cabinet' | 'stressed_colleague' | 'printer_jam' | 'audit_alert';
type CKind = 'coffee' | 'document' | 'calculator' | 'energy_drink' | 'compliance_manual';

interface Plr { x:number;y:number;vy:number;prevY:number;w:number;h:number;onGround:boolean;jumpsUsed:number;maxJumps:number;compliance:number;score:number;invTimer:number;abTimer:number;abCooldown:number;abActive:boolean;projCd:number;type:AccountantType;color:string;runF:number;runT:number;throwing:boolean;throwT:number; }
interface Ene { id:number;x:number;y:number;w:number;h:number;kind:EKind;vx:number;vy:number;health:number;dead:boolean;deadT:number;aT:number;aF:number;shootT?:number; }
interface Col { id:number;x:number;y:number;w:number;h:number;kind:CKind;taken:boolean;bobT:number; }
interface Proj { id:number;x:number;y:number;w:number;h:number;vx:number;vy:number;active:boolean;spin:number;fromPlayer:boolean; }
interface Plat { id:number;x:number;y:number;w:number;h:number; }
interface Part { x:number;y:number;vx:number;vy:number;life:number;maxL:number;col:string;r:number; }
interface FTxt { x:number;y:number;txt:string;life:number;vy:number;col:string; }
interface BgEl { x:number;type:'window'|'cubicle'|'light'|'plant'|'monitor'|'whiteboard'; }

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [],
  template: `<canvas #gc class="game-canvas"></canvas>`,
  styles: [`.game-canvas{display:block;width:100%;max-width:800px;height:auto;image-rendering:pixelated;border:3px solid #333;box-shadow:0 0 40px rgba(0,0,0,0.9);}`]
})
export class GameComponent implements AfterViewInit, OnDestroy {
  @ViewChild('gc', { static: true }) canRef!: ElementRef<HTMLCanvasElement>;
  @Input() characterType: AccountantType = AccountantType.PREPARER;
  @Output() gameOver = new EventEmitter<number>();

  private ctx!: CanvasRenderingContext2D;
  private raf = 0; private lastT = 0;
  private keys: Record<string,boolean> = {}; private prevK: Record<string,boolean> = {};
  private p!: Plr;
  private enemies: Ene[] = []; private cols: Col[] = []; private projs: Proj[] = [];
  private plats: Plat[] = []; private parts: Part[] = []; private ftxts: FTxt[] = [];
  private bgEls: BgEl[] = [];
  private scroll = BASE_SCROLL; private worldX = 0;
  private nextEne = 2.5; private nextCol = 1.8; private nextPlat = 3.5;
  private nextId = 1; private alive = true; private bgOff = 0;

  constructor(private zone: NgZone) {}

  ngAfterViewInit() {
    const canvas = this.canRef.nativeElement;
    canvas.width = CW; canvas.height = CH;
    this.ctx = canvas.getContext('2d')!;
    this.initPlayer(); this.initBg();
    this.plats.push({ id:this.nextId++, x:380, y:295, w:160, h:20 });
    this.plats.push({ id:this.nextId++, x:590, y:255, w:130, h:20 });
    window.addEventListener('keydown', this.kDown);
    window.addEventListener('keyup', this.kUp);
    this.zone.runOutsideAngular(() => { this.raf = requestAnimationFrame(t => this.loop(t)); });
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.kDown);
    window.removeEventListener('keyup', this.kUp);
  }

  private kDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;
    if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyZ','KeyX','KeyW'].includes(e.code)) e.preventDefault();
  };
  private kUp = (e: KeyboardEvent) => { this.keys[e.code] = false; };
  private jp(c: string) { return !!this.keys[c] && !this.prevK[c]; }

  private initPlayer() {
    const mj: Record<AccountantType,number> = { [AccountantType.PREPARER]:1,[AccountantType.REVIEWER]:2,[AccountantType.MANAGER]:1,[AccountantType.PARTNER]:1 };
    const cl: Record<AccountantType,string> = { [AccountantType.PREPARER]:'#4A90E2',[AccountantType.REVIEWER]:'#50C878',[AccountantType.MANAGER]:'#E74C3C',[AccountantType.PARTNER]:'#9B59B6' };
    this.p = { x:PLAYER_X, y:GROUND_TOP-PLAYER_H, vy:0, prevY:GROUND_TOP-PLAYER_H, w:PLAYER_W, h:PLAYER_H, onGround:true, jumpsUsed:0, maxJumps:mj[this.characterType], compliance:100, score:0, invTimer:0, abTimer:0, abCooldown:0, abActive:false, projCd:0, type:this.characterType, color:cl[this.characterType], runF:0, runT:0, throwing:false, throwT:0 };
  }

  private initBg() {
    const t: BgEl['type'][] = ['window','cubicle','light','plant','monitor','whiteboard'];
    for (let i = 0; i < 12; i++) this.bgEls.push({ x: i*180+60, type: t[Math.floor(Math.random()*t.length)] });
  }

  private loop(t: number) {
    const dt = Math.min((t - this.lastT) / 1000, 0.05);
    this.lastT = t;
    if (this.alive) this.update(dt);
    this.render();
    this.prevK = { ...this.keys };
    this.raf = requestAnimationFrame(ts => this.loop(ts));
  }

  private update(dt: number) {
    const p = this.p;
    p.prevY = p.y;

    // Jump
    if (this.jp('Space') || this.jp('ArrowUp') || this.jp('KeyW')) {
      if (p.jumpsUsed < p.maxJumps) { p.vy = JUMP_VEL; p.jumpsUsed++; p.onGround = false; this.spark(p.x+p.w/2, p.y+p.h, '#AAAAFF', 5); }
    }
    // Throw
    const cd = p.type === AccountantType.PREPARER && p.abActive ? 0.15 : 0.5;
    if (this.jp('KeyZ') && p.projCd <= 0) { this.doThrow(); p.projCd = cd; p.throwing = true; p.throwT = 0.22; }
    // Ability
    if (this.jp('KeyX') && p.abCooldown <= 0) this.doAbility();

    // Physics
    p.vy += GRAVITY * dt; p.y += p.vy * dt;
    p.onGround = false;
    if (p.y + p.h >= GROUND_TOP) { p.y = GROUND_TOP - p.h; p.vy = 0; p.onGround = true; p.jumpsUsed = 0; }
    for (const pl of this.plats) {
      if (p.vy >= 0 && p.prevY+p.h <= pl.y+2 && p.y+p.h >= pl.y && p.x+p.w > pl.x+4 && p.x < pl.x+pl.w-4) {
        p.y = pl.y - p.h; p.vy = 0; p.onGround = true; p.jumpsUsed = 0;
      }
    }
    if (p.y < -100) { p.y = -100; p.vy = 0; }

    p.projCd = Math.max(0, p.projCd-dt); p.invTimer = Math.max(0, p.invTimer-dt);
    p.abCooldown = Math.max(0, p.abCooldown-dt); p.abTimer = Math.max(0, p.abTimer-dt);
    if (p.abTimer <= 0) p.abActive = false;
    p.throwT = Math.max(0, p.throwT-dt); if (p.throwT <= 0) p.throwing = false;

    p.compliance -= COMPLIANCE_DRAIN * dt;
    if (p.compliance <= 0) { p.compliance = 0; this.endGame(); return; }

    if (p.onGround) { p.runT += dt; if (p.runT > 0.1) { p.runT = 0; p.runF = (p.runF+1)%4; } }

    this.scroll = BASE_SCROLL + Math.min(100, this.worldX/5000*100);
    this.worldX += this.scroll * dt;
    p.score = Math.floor(this.worldX / 10);
    this.bgOff += this.scroll * 0.28 * dt;

    this.bgEls.forEach(b => b.x -= this.scroll*0.35*dt);
    this.bgEls = this.bgEls.filter(b => b.x > -250);
    if (this.bgEls.length < 10) {
      const t: BgEl['type'][] = ['window','cubicle','light','plant','monitor','whiteboard'];
      const rx = Math.max(...this.bgEls.map(b=>b.x), CW);
      this.bgEls.push({ x: rx+130+Math.random()*80, type: t[Math.floor(Math.random()*t.length)] });
    }

    this.nextEne -= dt; if (this.nextEne <= 0) { this.spawnEnemy(); this.nextEne = 1.8+Math.random()*2.5; }
    this.nextCol -= dt; if (this.nextCol <= 0) { this.spawnCol(); this.nextCol = 1.5+Math.random()*2.0; }
    this.nextPlat -= dt; if (this.nextPlat <= 0) { this.spawnPlat(); this.nextPlat = 2.5+Math.random()*3.5; }

    this.updateEnemies(dt);
    this.cols.forEach(c => { c.x -= this.scroll*dt; c.bobT += dt*3; });
    this.cols = this.cols.filter(c => !c.taken && c.x+c.w > -50);
    this.updateProjs(dt);
    this.plats.forEach(pl => pl.x -= this.scroll*dt);
    this.plats = this.plats.filter(pl => pl.x+pl.w > -50);
    this.parts.forEach(pa => { pa.x+=pa.vx*dt; pa.y+=pa.vy*dt; pa.vy+=500*dt; pa.life-=dt; });
    this.parts = this.parts.filter(pa => pa.life > 0);
    this.ftxts.forEach(f => { f.y+=f.vy*dt; f.life-=dt; });
    this.ftxts = this.ftxts.filter(f => f.life > 0);

    if (p.invTimer <= 0) {
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (this.hit(p,e)) { p.compliance -= 20; p.invTimer = 1.5; this.spark(p.x+p.w/2,p.y+p.h/2,'#FF4444',14); this.pop(p.x-10,p.y-10,'-20%','#FF4444'); break; }
      }
    }
    for (const c of this.cols) {
      if (c.taken || !this.hit(p,c)) continue;
      c.taken = true;
      const [hp,pts] = this.colVal(c.kind);
      p.compliance = Math.min(100, p.compliance+hp); p.score += pts;
      this.spark(c.x+c.w/2,c.y+c.h/2,'#FFD700',8);
      if (hp > 0) this.pop(c.x, c.y-5, `+${hp}%`, '#00FF88');
      this.pop(c.x, c.y-20, `+${pts}`, '#FFD700');
    }
  }

  private hit(a:{x:number;y:number;w:number;h:number}, b:{x:number;y:number;w:number;h:number}) {
    return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
  }
  private pop(x:number,y:number,txt:string,col:string) { this.ftxts.push({x,y,txt,life:1.2,vy:-50,col}); }
  private colVal(k:CKind):[number,number] { return ({coffee:[10,25],document:[15,50],calculator:[20,75],energy_drink:[25,100],compliance_manual:[50,200]} as any)[k]; }

  private doThrow() {
    const p = this.p, n = p.type===AccountantType.MANAGER&&p.abActive ? 3 : 1;
    for (let i = 0; i < n; i++)
      this.projs.push({ id:this.nextId++, x:p.x+p.w+2, y:p.y+14, w:PROJ_W, h:PROJ_H, vx:PROJ_SPEED, vy:n>1?(i-1)*90:0, active:true, spin:0, fromPlayer:true });
  }

  private doAbility() {
    const p = this.p;
    if (p.type === AccountantType.PREPARER) {
      p.abActive=true; p.abTimer=5; p.abCooldown=12; this.pop(p.x-20,p.y-30,'RAPID FIRE!','#4A90E2');
    } else if (p.type === AccountantType.REVIEWER) {
      p.vy=JUMP_VEL*1.4; p.jumpsUsed=0; p.abCooldown=8; this.spark(p.x+p.w/2,p.y+p.h,'#50C878',20); this.pop(p.x-20,p.y-30,'SUPER JUMP!','#50C878');
    } else if (p.type === AccountantType.MANAGER) {
      p.abActive=true; p.abTimer=4; p.abCooldown=10; this.pop(p.x-30,p.y-30,'MULTI-STAPLER!','#E74C3C');
    } else if (p.type === AccountantType.PARTNER) {
      p.invTimer=4; p.abCooldown=15; this.spark(p.x+p.w/2,p.y+p.h/2,'#9B59B6',25); this.pop(p.x-20,p.y-30,'SHIELD!','#9B59B6');
    }
  }

  private spawnEnemy() {
    const pool: EKind[] = ['laptop','stressed_colleague'];
    if (this.worldX > 1500) pool.push('printer_jam');
    if (this.worldX > 3000) pool.push('filing_cabinet');
    if (this.worldX > 5000) pool.push('audit_alert');
    const kind = pool[Math.floor(Math.random()*pool.length)];
    const sz: Record<EKind,[number,number]> = { laptop:[38,28], filing_cabinet:[32,62], stressed_colleague:[24,40], printer_jam:[50,40], audit_alert:[36,36] };
    const [w,h] = sz[kind];
    const y = kind==='audit_alert' ? 120+Math.random()*180 : GROUND_TOP-h;
    this.enemies.push({ id:this.nextId++, x:CW+20, y, w, h, kind, vx:-(this.scroll+20+Math.random()*40), vy:0, health:kind==='audit_alert'?2:1, dead:false, deadT:0, aT:0, aF:0, shootT:kind==='printer_jam'?2.5:undefined });
  }

  private spawnCol() {
    const ks: CKind[] = ['coffee','document','calculator','energy_drink','compliance_manual'];
    const ws = [35,30,20,10,5]; let r = Math.random()*100; let kind: CKind = 'coffee';
    for (let i = 0; i < ks.length; i++) { r -= ws[i]; if (r <= 0) { kind = ks[i]; break; } }
    const sz: Record<CKind,[number,number]> = { coffee:[20,26], document:[20,24], calculator:[20,22], energy_drink:[16,28], compliance_manual:[26,30] };
    const [sw,sh] = sz[kind];
    const y = Math.random() < 0.35 ? GROUND_TOP-sh-80-Math.random()*60 : GROUND_TOP-sh-2;
    this.cols.push({ id:this.nextId++, x:CW+10, y, w:sw, h:sh, kind, taken:false, bobT:Math.random()*Math.PI*2 });
  }

  private spawnPlat() {
    this.plats.push({ id:this.nextId++, x:CW+30, y:225+Math.random()*110, w:110+Math.random()*120, h:20 });
  }

  private updateEnemies(dt: number) {
    for (const e of this.enemies) {
      if (e.dead) { e.deadT -= dt; continue; }
      e.x += e.vx*dt; e.aT += dt; if (e.aT > 0.12) { e.aT=0; e.aF=(e.aF+1)%4; }
      if (e.kind === 'audit_alert') {
        e.y += Math.sin(e.aT*3+e.id)*120*dt;
      } else {
        e.vy += GRAVITY*dt; e.y += e.vy*dt;
        if (e.y+e.h >= GROUND_TOP) { e.y = GROUND_TOP-e.h; e.vy=0; }
      }
      if (e.kind === 'printer_jam' && e.shootT !== undefined) {
        e.shootT -= dt;
        if (e.shootT <= 0 && e.x < CW && e.x > 0) {
          e.shootT = 2.5+Math.random();
          this.projs.push({ id:this.nextId++, x:e.x, y:e.y+e.h/2, w:20, h:12, vx:-200, vy:0, active:true, spin:0, fromPlayer:false });
        }
      }
    }
    this.enemies = this.enemies.filter(e => !(e.dead && e.deadT<=0) && e.x+e.w > -80);
  }

  private updateProjs(dt: number) {
    for (const pr of this.projs) {
      if (!pr.active) continue;
      pr.x += pr.vx*dt; pr.y += pr.vy*dt; pr.spin += 10*dt;
      if (pr.fromPlayer) {
        for (const e of this.enemies) {
          if (e.dead || !pr.active) continue;
          if (this.hit(pr,e)) {
            pr.active = false; e.health--;
            if (e.health <= 0) {
              e.dead=true; e.deadT=0.4;
              const pts = ({laptop:50,filing_cabinet:100,stressed_colleague:150,printer_jam:200,audit_alert:300} as any)[e.kind];
              this.p.score += pts; this.pop(e.x+e.w/2,e.y,`+${pts}`,'#FFD700'); this.spark(e.x+e.w/2,e.y+e.h/2,'#FF8800',16);
            }
          }
        }
      } else {
        if (this.p.invTimer <= 0 && this.hit(pr,this.p)) {
          pr.active=false; this.p.compliance-=15; this.p.invTimer=1.2;
          this.spark(this.p.x+this.p.w/2,this.p.y,'#FF4444',10); this.pop(this.p.x-10,this.p.y-10,'-15%','#FF4444');
        }
      }
    }
    this.projs = this.projs.filter(pr => pr.active && pr.x<CW+60 && pr.x>-60 && pr.y<CH+60);
  }

  private spark(x:number,y:number,col:string,n:number) {
    for (let i = 0; i < n; i++) {
      const a=Math.random()*Math.PI*2, s=60+Math.random()*180;
      this.parts.push({ x,y, vx:Math.cos(a)*s, vy:Math.sin(a)*s-80, life:0.35+Math.random()*0.35, maxL:0.7, col, r:2+Math.random()*3 });
    }
  }

  private endGame() {
    this.alive = false;
    setTimeout(() => this.zone.run(() => this.gameOver.emit(this.p.score)), 2600);
  }

  // ── RENDER ─────────────────────────────────────────────────────────
  private render() {
    const g = this.ctx;
    this.drawBg(g); this.drawGround(g); this.drawPlatforms(g);
    for (const c of this.cols) if (!c.taken) this.drawCol(g,c);
    for (const pr of this.projs) if (pr.active) this.drawProj(g,pr);
    for (const e of this.enemies) this.drawEnemy(g,e);
    this.drawPlayer(g, this.p);
    for (const pa of this.parts) { g.globalAlpha=Math.max(0,pa.life/pa.maxL); g.fillStyle=pa.col; g.beginPath(); g.arc(pa.x,pa.y,pa.r,0,Math.PI*2); g.fill(); }
    g.globalAlpha = 1;
    for (const f of this.ftxts) { g.globalAlpha=Math.min(1,f.life/0.4); g.font='bold 15px monospace'; g.lineWidth=3; g.strokeStyle='#000'; g.strokeText(f.txt,f.x,f.y); g.fillStyle=f.col; g.fillText(f.txt,f.x,f.y); }
    g.globalAlpha = 1;
    this.drawHUD(g);
    if (!this.alive) this.drawGameOver(g);
  }

  private drawBg(g: CanvasRenderingContext2D) {
    const gr = g.createLinearGradient(0,0,0,CH);
    gr.addColorStop(0,'#C8D8E8'); gr.addColorStop(0.18,'#D8E0E8'); gr.addColorStop(0.65,'#E8E0D4'); gr.addColorStop(1,'#C8B89A');
    g.fillStyle=gr; g.fillRect(0,0,CW,CH);
    const tw=80, off=this.bgOff%(tw*2);
    for (let x=-off; x<CW+tw; x+=tw) { g.fillStyle='#DDE8F0'; g.fillRect(x,0,tw-2,14); g.fillStyle='#FFFFC8'; g.fillRect(x+8,2,tw-18,10); }
    for (const b of this.bgEls) this.drawBgEl(g,b);
  }

  private drawBgEl(g: CanvasRenderingContext2D, b: BgEl) {
    const x = b.x;
    switch (b.type) {
      case 'window':
        g.fillStyle='#87CEEB'; g.fillRect(x,28,100,72);
        g.fillStyle='rgba(255,255,255,0.85)'; g.beginPath(); g.arc(x+22,52,13,0,Math.PI*2); g.arc(x+36,46,17,0,Math.PI*2); g.arc(x+52,52,13,0,Math.PI*2); g.fill();
        g.fillStyle='#B0B8C0'; g.fillRect(x-4,24,108,8); g.fillRect(x-4,96,108,8); g.fillRect(x-4,24,8,80); g.fillRect(x+96,24,8,80);
        g.strokeStyle='#888'; g.lineWidth=2; g.beginPath(); g.moveTo(x+50,28); g.lineTo(x+50,100); g.moveTo(x,62); g.lineTo(x+100,62); g.stroke();
        break;
      case 'cubicle':
        g.fillStyle='#9A8A74'; g.fillRect(x,110,8,GROUND_TOP-110); g.fillStyle='#B8A888'; g.fillRect(x+8,110,65,6); g.fillStyle='#9A8A74'; g.fillRect(x+65,110,8,GROUND_TOP-110);
        break;
      case 'monitor': {
        const dy=GROUND_TOP-62;
        g.fillStyle='#444455'; g.fillRect(x,dy-42,54,38); g.fillStyle='#2255AA'; g.fillRect(x+3,dy-39,48,32);
        g.fillStyle='#FFF'; for (let i=0;i<3;i++) g.fillRect(x+5,dy-36+i*10,44,8);
        g.fillStyle='#00AA44'; g.fillRect(x+7,dy-34,10,6); g.fillStyle='#FF4444'; g.fillRect(x+7,dy-24,6,6);
        g.fillStyle='#888'; g.fillRect(x+23,dy-4,8,4); g.fillRect(x+17,dy,20,4);
        break;
      }
      case 'plant':
        g.fillStyle='#7B5B14'; g.fillRect(x+14,GROUND_TOP-38,16,38);
        g.fillStyle='#2D8B2D'; g.beginPath(); g.arc(x+22,GROUND_TOP-52,28,0,Math.PI*2); g.fill();
        g.fillStyle='#1A6B1A'; g.beginPath(); g.arc(x+8,GROUND_TOP-62,18,0,Math.PI*2); g.arc(x+36,GROUND_TOP-62,18,0,Math.PI*2); g.fill();
        break;
      case 'light': {
        g.fillStyle='#AAA'; g.fillRect(x+20,0,4,22); g.fillStyle='#DDD'; g.fillRect(x+2,22,42,12); g.fillStyle='#FFFFAA'; g.fillRect(x+5,24,36,8);
        const grd=g.createRadialGradient(x+23,34,0,x+23,100,100); grd.addColorStop(0,'rgba(255,255,200,0.25)'); grd.addColorStop(1,'rgba(255,255,200,0)');
        g.fillStyle=grd; g.fillRect(x-60,22,166,200);
        break;
      }
      case 'whiteboard':
        g.fillStyle='#E8E8E8'; g.fillRect(x,40,130,80); g.fillStyle='#CCC'; g.fillRect(x,40,130,5); g.fillRect(x,115,130,5);
        g.strokeStyle='#4488FF'; g.lineWidth=2; g.beginPath(); g.moveTo(x+10,70); g.lineTo(x+40,90); g.lineTo(x+80,60); g.lineTo(x+110,75); g.stroke();
        g.fillStyle='#CC4444'; g.font='6px monospace'; g.fillText('Q4 TARGETS',x+8,58);
        break;
    }
  }

  private drawGround(g: CanvasRenderingContext2D) {
    const gr=g.createLinearGradient(0,GROUND_TOP,0,CH);
    gr.addColorStop(0,'#7A9A5A'); gr.addColorStop(0.12,'#5A8040'); gr.addColorStop(1,'#3A5A28');
    g.fillStyle=gr; g.fillRect(0,GROUND_TOP,CW,CH-GROUND_TOP);
    g.fillStyle='rgba(0,0,0,0.08)';
    const po=this.worldX%40;
    for (let x=-po; x<CW; x+=40) for (let y=GROUND_TOP+5; y<CH; y+=18) g.fillRect(x,y,16,2);
    g.fillStyle='#9ABA7A'; g.fillRect(0,GROUND_TOP,CW,4); g.fillStyle='#BADA9A'; g.fillRect(0,GROUND_TOP,CW,2);
  }

  private drawPlatforms(g: CanvasRenderingContext2D) {
    for (const pl of this.plats) {
      g.fillStyle='#7A5A14'; g.fillRect(pl.x,pl.y,pl.w,pl.h);
      g.fillStyle='#A07822'; g.fillRect(pl.x,pl.y,pl.w,5);
      g.fillStyle='#503A0A'; g.fillRect(pl.x,pl.y+pl.h-3,pl.w,3);
      g.fillStyle='#6A4E12'; g.fillRect(pl.x+10,pl.y+pl.h,10,28); g.fillRect(pl.x+pl.w-20,pl.y+pl.h,10,28);
    }
  }

  private drawPlayer(g: CanvasRenderingContext2D, p: Plr) {
    if (p.invTimer>0 && Math.floor(p.invTimer*12)%2===0) return;
    const x=Math.floor(p.x), y=Math.floor(p.y), f=p.runF;
    if (p.invTimer>0.1||p.abActive) { g.strokeStyle=p.invTimer>0.1?'#FFD700':p.color; g.lineWidth=2; g.globalAlpha=0.5; g.beginPath(); g.arc(x+p.w/2,y+p.h/2,p.w,0,Math.PI*2); g.stroke(); g.globalAlpha=1; }
    const la=p.onGround?Math.sin(f*Math.PI/2)*6:0;
    g.fillStyle='#2A3A4A'; g.fillRect(x+3,y+p.h-16,9,16+la); g.fillRect(x+p.w-12,y+p.h-16,9,16-la);
    g.fillStyle='#111'; g.fillRect(x+1,y+p.h-4,12,4); g.fillRect(x+p.w-13,y+p.h-4,12,4);
    g.fillStyle=p.color; g.fillRect(x+3,y+p.h-29,p.w-6,14);
    g.fillStyle='#CC2222'; g.fillRect(x+p.w/2-3,y+p.h-28,5,11); g.beginPath(); g.moveTo(x+p.w/2-3,y+p.h-18); g.lineTo(x+p.w/2+2,y+p.h-18); g.lineTo(x+p.w/2,y+p.h-13); g.fill();
    g.fillStyle='#F5C5A3'; g.fillRect(x+5,y+p.h-40,p.w-10,12);
    g.fillStyle=p.color; g.fillRect(x+3,y+p.h-42,p.w-6,5); g.fillRect(x+p.w-7,y+p.h-39,8,3);
    g.fillStyle='#1A1A1A'; g.fillRect(x+8,y+p.h-37,3,3); g.fillRect(x+p.w-11,y+p.h-37,3,3);
    g.fillRect(x+10,y+p.h-31,p.throwing?7:5,2);
    g.fillStyle=p.color;
    if (p.throwing) { g.fillRect(x+p.w-1,y+p.h-29,14,6); g.fillStyle='#555566'; g.fillRect(x+p.w+12,y+p.h-32,15,9); }
    else g.fillRect(x+p.w-1,y+p.h-27,8,5);
  }

  private drawEnemy(g: CanvasRenderingContext2D, e: Ene) {
    if (e.dead) { g.globalAlpha=e.deadT/0.4; g.fillStyle='#FF8800'; g.fillRect(e.x,e.y,e.w,e.h); g.globalAlpha=1; return; }
    const x=Math.floor(e.x), y=Math.floor(e.y);
    switch (e.kind) {
      case 'laptop':
        g.fillStyle='#7A7A8A'; g.fillRect(x,y+e.h-8,e.w,8); g.fillStyle='#555566'; g.fillRect(x+2,y,e.w-4,e.h-10);
        g.fillStyle='#2244AA'; g.fillRect(x+4,y+2,e.w-8,e.h-15); g.fillStyle='#FFF'; for (let i=0;i<3;i++) g.fillRect(x+6,y+4+i*6,e.w-12,3); g.fillStyle='#FF4444'; g.fillRect(x+6,y+4,6,3);
        break;
      case 'filing_cabinet':
        g.fillStyle='#9898AA'; g.fillRect(x,y,e.w,e.h); g.fillStyle='#B0B0C0';
        for (let i=0;i<3;i++) g.fillRect(x+3,y+5+i*19,e.w-6,16); g.fillStyle='#666'; for (let i=0;i<3;i++) g.fillRect(x+e.w/2-6,y+12+i*19,12,3);
        break;
      case 'stressed_colleague': {
        const la=Math.sin(e.aT*8)*5;
        g.fillStyle='#2A3A5A'; g.fillRect(x+4,y+e.h-14,7,14+la); g.fillRect(x+e.w-11,y+e.h-14,7,14-la);
        g.fillStyle='#111'; g.fillRect(x+2,y+e.h-4,10,4); g.fillRect(x+e.w-12,y+e.h-4,10,4);
        g.fillStyle='#EEDDCC'; g.fillRect(x+3,y+e.h-28,e.w-6,16);
        g.fillStyle='#FFF'; const pa=Math.sin(e.aT*5);
        g.save(); g.translate(x+e.w-1,y+e.h-30); g.rotate(pa*0.5); g.fillRect(0,-12,10,12); g.restore();
        g.save(); g.translate(x+e.w+6,y+e.h-32); g.rotate(-pa*0.4); g.fillRect(0,-10,8,10); g.restore();
        g.fillStyle='#F09070'; g.fillRect(x+5,y+e.h-38,e.w-10,11);
        g.fillStyle='#332200'; g.fillRect(x+5,y+e.h-41,e.w-10,5);
        g.fillStyle='#1A1A1A'; g.fillRect(x+8,y+e.h-36,3,3); g.fillRect(x+e.w-11,y+e.h-36,3,3);
        g.fillStyle='#FF0000'; g.font='bold 11px monospace'; g.fillText('!!',x+e.w-4,y+e.h-38);
        break;
      }
      case 'printer_jam': {
        g.fillStyle='#C8C8C8'; g.fillRect(x,y+e.h-30,e.w,30); g.fillStyle='#EEE'; g.fillRect(x+5,y+e.h-44,e.w-10,20);
        const jb=Math.sin(e.aT*4)*2; g.fillStyle='#FFCCCC'; g.fillRect(x+8,y+e.h-46+jb,e.w-16,10); g.fillStyle='#FF4444'; g.fillRect(x+e.w/2-6,y+e.h-48+jb,12,5);
        g.fillStyle='#3366FF'; g.fillRect(x+6,y+e.h-24,e.w-12,8); g.fillStyle='#FF0000'; g.font='7px monospace'; g.fillText('PAPER JAM',x+8,y+e.h-17);
        g.fillStyle=e.aF%2===0?'#FF3300':'#FF8800'; g.beginPath(); g.arc(x+e.w-8,y+e.h-24,5,0,Math.PI*2); g.fill();
        break;
      }
      case 'audit_alert': {
        const bv=Math.sin(e.aT*2.5)*5;
        g.fillStyle='#FFF0F0'; g.fillRect(x,y+bv,e.w,e.h); g.fillStyle='#CC0000'; g.fillRect(x,y+bv,e.w,11);
        g.fillStyle='#FFF'; g.font='bold 8px monospace'; g.fillText('AUDIT',x+3,y+bv+9);
        g.fillStyle='#CC4444'; for (let i=0;i<4;i++) g.fillRect(x+4,y+bv+14+i*6,e.w-8,3);
        g.fillStyle='#FF0000'; g.font='bold 18px monospace'; g.fillText('!',x+e.w/2-5,y+bv+e.h-3);
        g.shadowColor='#FF0000'; g.shadowBlur=12; g.strokeStyle='#FF0000'; g.lineWidth=2; g.strokeRect(x,y+bv,e.w,e.h); g.shadowBlur=0;
        break;
      }
    }
  }

  private drawCol(g: CanvasRenderingContext2D, c: Col) {
    const bob=Math.sin(c.bobT)*4, x=Math.floor(c.x), y=Math.floor(c.y+bob);
    switch (c.kind) {
      case 'coffee':
        g.fillStyle='#C8A882'; g.fillRect(x+2,y+8,c.w-4,c.h-8); g.fillStyle='#7A4A2A'; g.fillRect(x+4,y+10,c.w-8,c.h-12);
        g.fillStyle='#C8A882'; g.fillRect(x+2,y+7,c.w-4,4); g.strokeStyle='#C8A882'; g.lineWidth=3; g.beginPath(); g.arc(x+c.w-1,y+15,6,-1.5,1.5); g.stroke();
        g.fillStyle='#FF8800'; g.font='bold 9px monospace'; g.fillText('+10%',x-4,y+5); break;
      case 'energy_drink': {
        const gr=g.createLinearGradient(x,y,x+c.w,y); gr.addColorStop(0,'#006600'); gr.addColorStop(0.5,'#00CC00'); gr.addColorStop(1,'#006600');
        g.fillStyle=gr; g.fillRect(x+2,y+3,c.w-4,c.h-3); g.fillStyle='#CCC'; g.fillRect(x+2,y,c.w-4,5);
        g.fillStyle='#00FF44'; g.font='bold 9px monospace'; g.fillText('+25%',x-4,y+2); break;
      }
      case 'compliance_manual':
        g.fillStyle='#1A3A8A'; g.fillRect(x,y,c.w,c.h); g.fillStyle='#2A4AAA'; g.fillRect(x,y,6,c.h);
        g.fillStyle='#EEE'; g.fillRect(x+c.w-4,y+2,4,c.h-4); g.fillStyle='#FFD700'; g.font='5px monospace'; g.fillText('COMP',x+8,y+11); g.fillText('GUIDE',x+8,y+20);
        g.fillStyle='#00FF88'; g.font='bold 9px monospace'; g.fillText('+50%',x-4,y-2); break;
      case 'document':
        g.fillStyle='#FFF'; g.fillRect(x+2,y,c.w-4,c.h); g.fillStyle='#AAA'; for (let i=0;i<4;i++) g.fillRect(x+4,y+4+i*5,c.w-8,2);
        g.fillStyle='#CC0000'; g.fillRect(x+4,y+4,8,2); g.fillStyle='#FFD700'; g.font='bold 9px monospace'; g.fillText('+15%',x-4,y-2); break;
      case 'calculator':
        g.fillStyle='#444466'; g.fillRect(x,y,c.w,c.h); g.fillStyle='#88EE88'; g.fillRect(x+2,y+2,c.w-4,7);
        g.fillStyle='#CCCCFF'; for (let r=0;r<3;r++) for (let cl=0;cl<3;cl++) g.fillRect(x+3+cl*6,y+12+r*5,4,3);
        g.fillStyle='#FFD700'; g.font='bold 9px monospace'; g.fillText('+20%',x-4,y-2); break;
    }
  }

  private drawProj(g: CanvasRenderingContext2D, pr: Proj) {
    g.save(); g.translate(pr.x+pr.w/2,pr.y+pr.h/2); g.rotate(pr.spin);
    if (pr.fromPlayer) { g.fillStyle='#333344'; g.fillRect(-pr.w/2,-pr.h/2,pr.w,pr.h); g.fillStyle='#555566'; g.fillRect(-pr.w/2,-pr.h/2,pr.w,pr.h/2); g.fillStyle='#888899'; g.fillRect(-pr.w/2+2,-1,5,2); }
    else { g.fillStyle='#EEE'; g.fillRect(-pr.w/2,-pr.h/2,pr.w,pr.h); g.fillStyle='#AAA'; g.fillRect(-pr.w/2+2,-2,pr.w-4,2); }
    g.restore();
  }

  private drawHUD(g: CanvasRenderingContext2D) {
    const p = this.p;
    g.fillStyle='rgba(0,0,0,0.65)'; g.fillRect(10,8,240,32);
    g.fillStyle='#333'; g.fillRect(18,13,205,20);
    const pct=p.compliance/100, bc=pct>0.55?'#00CC44':pct>0.28?'#FFAA00':'#FF2200';
    g.fillStyle=bc; g.fillRect(18,13,205*pct,20); g.strokeStyle='#FFF'; g.lineWidth=2; g.strokeRect(18,13,205,20);
    g.fillStyle='#FFF'; g.font='bold 11px monospace'; g.fillText(`COMPLIANCE  ${Math.ceil(p.compliance)}%`,22,27);
    g.fillStyle='rgba(0,0,0,0.65)'; g.fillRect(CW-195,8,185,32); g.fillStyle='#FFD700'; g.font='bold 16px monospace'; g.fillText(`SCORE: ${p.score}`,CW-188,28);
    g.fillStyle='rgba(0,0,0,0.65)'; g.fillRect(10,CH-50,240,42);
    const names: Record<AccountantType,string> = { [AccountantType.PREPARER]:'PREPARER',[AccountantType.REVIEWER]:'REVIEWER',[AccountantType.MANAGER]:'MANAGER',[AccountantType.PARTNER]:'PARTNER' };
    g.fillStyle=p.color; g.font='bold 13px monospace'; g.fillText(names[p.type],18,CH-32);
    const maxCds: Record<AccountantType,number> = { [AccountantType.PREPARER]:12,[AccountantType.REVIEWER]:8,[AccountantType.MANAGER]:10,[AccountantType.PARTNER]:15 };
    const ready=p.abCooldown<=0;
    g.fillStyle='#333'; g.fillRect(18,CH-26,100,10); g.fillStyle=ready?'#00FFFF':'#5588AA'; g.fillRect(18,CH-26,100*Math.min(1,1-p.abCooldown/maxCds[p.type]),10); g.strokeStyle='#888'; g.lineWidth=1; g.strokeRect(18,CH-26,100,10);
    g.fillStyle=ready?'#00FFFF':'#AAA'; g.font='9px monospace'; g.fillText(ready?'[X] ABILITY READY!':`[X] ${p.abCooldown.toFixed(1)}s`,18,CH-11);
    g.fillStyle='rgba(0,0,0,0.5)'; g.fillRect(CW-255,CH-30,245,22); g.fillStyle='#888'; g.font='10px monospace'; g.fillText('SPACE/W: JUMP   Z: STAPLER   X: ABILITY',CW-251,CH-14);
  }

  private drawGameOver(g: CanvasRenderingContext2D) {
    g.fillStyle='rgba(0,0,0,0.78)'; g.fillRect(0,0,CW,CH);
    g.textAlign='center';
    g.fillStyle='#FF3333'; g.font='bold 48px monospace'; g.fillText('COMPLIANCE FAILED',CW/2,CH/2-40);
    g.fillStyle='#FFF'; g.font='20px monospace'; g.fillText('The audit got you.',CW/2,CH/2+2);
    g.fillStyle='#FFD700'; g.font='bold 30px monospace'; g.fillText(`SCORE: ${this.p.score}`,CW/2,CH/2+46);
    g.fillStyle='#888'; g.font='15px monospace'; g.fillText('Returning to results...',CW/2,CH/2+80);
    g.textAlign='left';
  }
}
