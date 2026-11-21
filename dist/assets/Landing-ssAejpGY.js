import{u as l,j as e}from"./index-BS6fYTMo.js";import{L as n}from"./react-EAYn8Nyf.js";const r=[{path:"/tool/quick-split",label:"Split Bill",icon:"⚡",desc:"Split bills with friends"},{path:"/tool/emi",label:"EMI Calculator",icon:"🏦",desc:"Home, car & personal loans"},{path:"/tool/gst",label:"GST Calculator",icon:"🧾",desc:"Inclusive & exclusive"},{path:"/tool/sip",label:"SIP Calculator",icon:"📈",desc:"Mutual fund returns"},{path:"/tool/income-tax",label:"Income Tax",icon:"📊",desc:"Old vs new regime"},{path:"/tool/currency",label:"Currency Converter",icon:"💱",desc:"INR to world"},{path:"/tool/nri-tax",label:"NRI Tax",icon:"🌍",desc:"Taxation for NRIs"},{path:"/tool/nri-days",label:"NRI Day Tracker",icon:"📅",desc:"182-day residency rule"},{path:"/tool/hra",label:"HRA Calculator",icon:"🏠",desc:"House rent allowance"},{path:"/tool/tds",label:"TDS Calculator",icon:"💸",desc:"Tax deducted at source"}];function s(){const{t}=l();return e.jsxs("div",{className:"fade-in",children:[e.jsxs("header",{style:{marginBottom:"var(--space-6)",textAlign:"center"},children:[e.jsx("h1",{style:{fontSize:"clamp(2rem, 5vw, 3rem)",fontWeight:800},children:t("brand")}),e.jsx("p",{className:"muted",style:{fontSize:"1.1rem",maxWidth:"600px",margin:"8px auto"},children:"Your complete Indian financial toolkit. Fast, accurate, and private."})]}),e.jsx("div",{style:{display:"grid",gridTemplateColumns:"repeat(2, 1fr)",gap:"var(--space-4)",maxWidth:"900px",margin:"0 auto"},className:"tool-grid",children:r.map(a=>e.jsxs(n,{to:a.path,className:"card tool-button","aria-label":`Open ${a.label}: ${a.desc}`,children:[e.jsx("span",{style:{fontSize:"2.5rem",lineHeight:1,marginBottom:8},children:a.icon}),e.jsx("h2",{style:{fontSize:"1rem",fontWeight:700,margin:0},children:a.label}),e.jsx("p",{className:"muted",style:{fontSize:"0.75rem",margin:"4px 0 0"},children:a.desc})]},a.path))}),e.jsx("style",{children:`
        .tool-button {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: var(--space-5) var(--space-3);
          text-decoration: none;
          color: inherit;
          transition: transform 120ms ease, box-shadow 120ms ease;
          min-height: 160px;
          border-radius: var(--radius-lg);
        }
        .tool-button:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-2);
        }
        @media (min-width: 768px) {
          .tool-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
      `})]})}export{s as default};
