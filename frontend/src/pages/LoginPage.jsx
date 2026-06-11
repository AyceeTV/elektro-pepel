import { useState } from "react";
export default function LoginPage({ onLogin }) {
  const [sprache, setSprache] = (() => {
    const [s, setS] = [localStorage.getItem("sprache")||"de", (lang) => { localStorage.setItem("sprache",lang); window.location.reload(); }];
    return [s, setS];
  })();
  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [fehler, setFehler] = useState("");
  const [laden, setLaden] = useState(false);
  const [isMobile] = useState(typeof window !== "undefined" && window.innerWidth < 768);

  const ro = sprache === "ro";

  async function submit(e) {
    e.preventDefault();
    setFehler(""); setLaden(true);
    try {
      const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const formData = new FormData();
      formData.append("username", email);
      formData.append("password", passwort);
      const res = await fetch(API + "/api/auth/login", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("user", JSON.stringify(data.user));
        onLogin(data.user, data.access_token);
      } else {
        setFehler(ro ? "E-mail sau parolă incorectă" : "E-Mail oder Passwort falsch");
      }
    } catch { setFehler("Verbindungsfehler"); }
    setLaden(false);
  }

  // ── MOBIL ──────────────────────────────────────────────────────────────────
  if (isMobile) return (
    <div style={{
      minHeight:"100vh", background:"linear-gradient(160deg, #0f1923 0%, #1a3d6e 60%, #0f1923 100%)",
      display:"flex", flexDirection:"column", position:"relative", overflow:"hidden",
    }}>
      {/* Deko Kreise */}
      <div style={{position:"absolute",top:-80,right:-80,width:220,height:220,borderRadius:"50%",background:"rgba(245,158,11,0.12)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:-60,left:-60,width:180,height:180,borderRadius:"50%",background:"rgba(245,158,11,0.07)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",top:"30%",left:-40,width:120,height:120,borderRadius:"50%",background:"rgba(255,255,255,0.04)",pointerEvents:"none"}}/>

      {/* Sprache oben rechts */}
      <div style={{display:"flex",justifyContent:"flex-end",padding:"16px 20px",position:"relative",zIndex:10}}>
        <button onClick={()=>setSprache(ro?"de":"ro")} style={{
          background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",
          borderRadius:20,padding:"5px 14px",color:"white",fontSize:12,fontWeight:600,cursor:"pointer"
        }}>{ro?"🇩🇪 DE":"🇷🇴 RO"}</button>
      </div>

      {/* Logo + Titel */}
      <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 28px 20px",position:"relative",zIndex:10}}>
        <div style={{marginBottom:36,textAlign:"center"}}>
          {/* Logo Kreis */}
          <div style={{
            width:80,height:80,borderRadius:"50%",
            background:"linear-gradient(135deg,#f59e0b,#d97706)",
            display:"flex",alignItems:"center",justifyContent:"center",
            margin:"0 auto 16px",
            boxShadow:"0 0 40px rgba(245,158,11,0.4)",
          }}>
            <span style={{fontSize:36}}>⚡</span>
          </div>
          <h1 style={{fontSize:28,fontWeight:800,color:"white",margin:"0 0 6px",letterSpacing:"-0.5px"}}>
            {ro?"Bun venit":"Willkommen"}
          </h1>
          <p style={{color:"rgba(255,255,255,0.5)",fontSize:14,margin:0}}>Elektro Pepel GmbH</p>
        </div>

        {/* Formular Karte */}
        <div style={{
          background:"rgba(255,255,255,0.07)",
          backdropFilter:"blur(20px)",
          border:"1px solid rgba(255,255,255,0.12)",
          borderRadius:20,
          padding:"28px 24px",
        }}>
          <h2 style={{color:"white",fontSize:20,fontWeight:700,margin:"0 0 6px"}}>{ro?"Conectare":"Anmelden"}</h2>
          <p style={{color:"rgba(255,255,255,0.4)",fontSize:13,margin:"0 0 24px"}}>{ro?"Introduceți datele de acces":"Zugangsdaten eingeben"}</p>

          <form onSubmit={submit}>
            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.5)",marginBottom:7,letterSpacing:"0.05em"}}>
                {ro?"E-MAIL":"E-MAIL"}
              </label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required
                placeholder={ro?"adresa@email.com":"name@firma.de"}
                style={{
                  width:"100%",padding:"13px 16px",fontSize:15,
                  background:"rgba(255,255,255,0.08)",
                  border:"1.5px solid rgba(255,255,255,0.15)",
                  borderRadius:10,color:"white",outline:"none",boxSizing:"border-box",
                  "::placeholder":{color:"rgba(255,255,255,0.3)"},
                }}
                onFocus={e=>{e.target.style.border="1.5px solid #f59e0b";e.target.style.background="rgba(245,158,11,0.08)";}}
                onBlur={e=>{e.target.style.border="1.5px solid rgba(255,255,255,0.15)";e.target.style.background="rgba(255,255,255,0.08)";}}
              />
            </div>

            <div style={{marginBottom:fehler?16:24}}>
              <label style={{display:"block",fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.5)",marginBottom:7,letterSpacing:"0.05em"}}>
                {ro?"PAROLĂ":"PASSWORT"}
              </label>
              <input type="password" value={passwort} onChange={e=>setPasswort(e.target.value)} required
                placeholder="••••••••"
                style={{
                  width:"100%",padding:"13px 16px",fontSize:15,
                  background:"rgba(255,255,255,0.08)",
                  border:"1.5px solid rgba(255,255,255,0.15)",
                  borderRadius:10,color:"white",outline:"none",boxSizing:"border-box",
                }}
                onFocus={e=>{e.target.style.border="1.5px solid #f59e0b";e.target.style.background="rgba(245,158,11,0.08)";}}
                onBlur={e=>{e.target.style.border="1.5px solid rgba(255,255,255,0.15)";e.target.style.background="rgba(255,255,255,0.08)";}}
              />
            </div>

            {fehler && (
              <div style={{background:"rgba(220,38,38,0.2)",border:"1px solid rgba(220,38,38,0.4)",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#fca5a5",marginBottom:16}}>
                ⚠️ {fehler}
              </div>
            )}

            <button type="submit" disabled={laden} style={{
              width:"100%",padding:"14px",
              background: laden ? "rgba(245,158,11,0.5)" : "linear-gradient(135deg,#f59e0b,#d97706)",
              border:"none",borderRadius:10,
              fontSize:16,fontWeight:800,color:"#0f1923",
              cursor:laden?"not-allowed":"pointer",
              boxShadow: laden ? "none" : "0 4px 20px rgba(245,158,11,0.4)",
              transition:"all 0.2s",
              letterSpacing:"0.02em",
            }}>
              {laden ? "⏳ ..." : (ro?"Conectare →":"Anmelden →")}
            </button>
          </form>
        </div>

        <p style={{textAlign:"center",color:"rgba(255,255,255,0.25)",fontSize:12,marginTop:24}}>
          © 2025 Elektro Pepel GmbH
        </p>
      </div>
    </div>
  );

  // ── PC / TABLET ────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight:"100vh",
      background:"linear-gradient(135deg, #0f1923 0%, #1a3d6e 50%, #0f1923 100%)",
      display:"flex",alignItems:"center",justifyContent:"center",
      padding:20,position:"relative",overflow:"hidden",
    }}>
      {/* Deko Kreise */}
      <div style={{position:"absolute",top:-120,right:-120,width:400,height:400,borderRadius:"50%",background:"rgba(245,158,11,0.08)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:-100,left:-100,width:300,height:300,borderRadius:"50%",background:"rgba(245,158,11,0.06)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",top:"50%",left:"25%",transform:"translate(-50%,-50%)",width:600,height:600,borderRadius:"50%",background:"rgba(255,255,255,0.02)",pointerEvents:"none"}}/>

      {/* Sprache */}
      <div style={{position:"absolute",top:24,right:24,zIndex:10}}>
        <button onClick={()=>setSprache(ro?"de":"ro")} style={{
          background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",
          borderRadius:20,padding:"6px 16px",color:"white",fontSize:13,fontWeight:600,cursor:"pointer",
          backdropFilter:"blur(10px)",
        }}>{ro?"🇩🇪 Deutsch":"🇷🇴 Română"}</button>
      </div>

      {/* Haupt-Card */}
      <div style={{
        width:"100%",maxWidth:900,
        background:"rgba(255,255,255,0.05)",
        backdropFilter:"blur(30px)",
        border:"1px solid rgba(255,255,255,0.1)",
        borderRadius:24,
        overflow:"hidden",
        display:"grid",
        gridTemplateColumns:"1fr 1fr",
        boxShadow:"0 25px 50px rgba(0,0,0,0.5)",
        position:"relative",zIndex:1,
      }}>
        {/* ── Linke Seite: Branding ── */}
        <div style={{
          background:"linear-gradient(160deg,rgba(245,158,11,0.15) 0%,rgba(245,158,11,0.05) 100%)",
          padding:"52px 48px",
          display:"flex",flexDirection:"column",justifyContent:"space-between",
          borderRight:"1px solid rgba(255,255,255,0.08)",
          position:"relative",overflow:"hidden",
        }}>
          {/* Deko */}
          <div style={{position:"absolute",bottom:-60,right:-60,width:200,height:200,borderRadius:"50%",background:"rgba(245,158,11,0.1)",pointerEvents:"none"}}/>
          <div style={{position:"absolute",top:-40,left:-40,width:150,height:150,borderRadius:"50%",background:"rgba(255,255,255,0.03)",pointerEvents:"none"}}/>

          <div style={{position:"relative",zIndex:1}}>
            {/* Logo */}
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:52}}>
              <div style={{
                width:52,height:52,borderRadius:14,
                background:"linear-gradient(135deg,#f59e0b,#d97706)",
                display:"flex",alignItems:"center",justifyContent:"center",
                boxShadow:"0 0 30px rgba(245,158,11,0.5)",
                flexShrink:0,
              }}>
                <span style={{fontSize:26}}>⚡</span>
              </div>
              <div>
                <div style={{fontSize:18,fontWeight:800,color:"white",lineHeight:1}}>Elektro Pepel</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginTop:2}}>GmbH</div>
              </div>
            </div>

            <h1 style={{fontSize:36,fontWeight:800,color:"white",margin:"0 0 16px",lineHeight:1.2,letterSpacing:"-0.5px"}}>
              {ro?"Bun venit\nînapoi!":"Willkommen\nzurück!"}
            </h1>
            <p style={{color:"rgba(255,255,255,0.5)",fontSize:15,margin:"0 0 40px",lineHeight:1.6}}>
              {ro?"Sistemul de management pentru echipa Elektro Pepel.":"Das Verwaltungssystem für das Team von Elektro Pepel."}
            </p>

            {/* Features */}
            {[
              ["⏱", ro?"Pontaj digital":"Digitale Zeiterfassung"],
              ["📋", ro?"Gestionare comenzi":"Auftrags­verwaltung"],
              ["📄", ro?"Bonuri de regie cu PDF":"Regiezettel mit PDF"],
            ].map(([icon, text]) => (
              <div key={text} style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
                <div style={{width:34,height:34,borderRadius:8,background:"rgba(245,158,11,0.15)",border:"1px solid rgba(245,158,11,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{icon}</div>
                <span style={{fontSize:14,color:"rgba(255,255,255,0.7)",fontWeight:500}}>{text}</span>
              </div>
            ))}
          </div>

          <p style={{color:"rgba(255,255,255,0.2)",fontSize:12,margin:0,position:"relative",zIndex:1}}>
            © 2025 Elektro Pepel GmbH
          </p>
        </div>

        {/* ── Rechte Seite: Formular ── */}
        <div style={{padding:"52px 48px",display:"flex",flexDirection:"column",justifyContent:"center"}}>
          <h2 style={{fontSize:28,fontWeight:800,color:"white",margin:"0 0 8px",letterSpacing:"-0.3px"}}>
            {ro?"Conectare":"Anmelden"}
          </h2>
          <p style={{color:"rgba(255,255,255,0.4)",fontSize:14,margin:"0 0 36px"}}>
            {ro?"Introduceți datele de acces pentru a continua.":"Zugangsdaten eingeben um fortzufahren."}
          </p>

          <form onSubmit={submit}>
            <div style={{marginBottom:20}}>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.4)",marginBottom:8,letterSpacing:"0.08em"}}>
                E-MAIL
              </label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required
                placeholder={ro?"adresa@email.com":"name@elektropepel.de"}
                style={{
                  width:"100%",padding:"14px 18px",fontSize:15,
                  background:"rgba(255,255,255,0.07)",
                  border:"1.5px solid rgba(255,255,255,0.12)",
                  borderRadius:12,color:"white",outline:"none",boxSizing:"border-box",
                  transition:"all 0.2s",
                }}
                onFocus={e=>{e.target.style.border="1.5px solid #f59e0b";e.target.style.background="rgba(245,158,11,0.08)";e.target.style.boxShadow="0 0 0 3px rgba(245,158,11,0.15)";}}
                onBlur={e=>{e.target.style.border="1.5px solid rgba(255,255,255,0.12)";e.target.style.background="rgba(255,255,255,0.07)";e.target.style.boxShadow="none";}}
              />
            </div>

            <div style={{marginBottom:fehler?20:32}}>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.4)",marginBottom:8,letterSpacing:"0.08em"}}>
                {ro?"PAROLĂ":"PASSWORT"}
              </label>
              <input type="password" value={passwort} onChange={e=>setPasswort(e.target.value)} required
                placeholder="••••••••"
                style={{
                  width:"100%",padding:"14px 18px",fontSize:15,
                  background:"rgba(255,255,255,0.07)",
                  border:"1.5px solid rgba(255,255,255,0.12)",
                  borderRadius:12,color:"white",outline:"none",boxSizing:"border-box",
                  transition:"all 0.2s",
                }}
                onFocus={e=>{e.target.style.border="1.5px solid #f59e0b";e.target.style.background="rgba(245,158,11,0.08)";e.target.style.boxShadow="0 0 0 3px rgba(245,158,11,0.15)";}}
                onBlur={e=>{e.target.style.border="1.5px solid rgba(255,255,255,0.12)";e.target.style.background="rgba(255,255,255,0.07)";e.target.style.boxShadow="none";}}
              />
            </div>

            {fehler && (
              <div style={{background:"rgba(220,38,38,0.15)",border:"1px solid rgba(220,38,38,0.3)",borderRadius:10,padding:"12px 16px",fontSize:13,color:"#fca5a5",marginBottom:20,display:"flex",gap:8,alignItems:"center"}}>
                <span>⚠️</span> {fehler}
              </div>
            )}

            <button type="submit" disabled={laden} style={{
              width:"100%",padding:"15px",
              background: laden ? "rgba(245,158,11,0.4)" : "linear-gradient(135deg,#f59e0b,#d97706)",
              border:"none",borderRadius:12,
              fontSize:16,fontWeight:800,color:"#0f1923",
              cursor:laden?"not-allowed":"pointer",
              boxShadow: laden ? "none" : "0 4px 24px rgba(245,158,11,0.4)",
              transition:"all 0.2s",
              letterSpacing:"0.02em",
            }}
              onMouseEnter={e=>{ if(!laden){e.target.style.transform="translateY(-1px)";e.target.style.boxShadow="0 6px 30px rgba(245,158,11,0.5)";} }}
              onMouseLeave={e=>{ e.target.style.transform="translateY(0)";e.target.style.boxShadow=laden?"none":"0 4px 24px rgba(245,158,11,0.4)"; }}
            >
              {laden ? "⏳ ..." : (ro?"Conectare →":"Anmelden →")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}