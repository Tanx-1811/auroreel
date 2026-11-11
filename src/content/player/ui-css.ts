/** Styles of the on-page UI, inside its shadow root (the page's CSS can't reach it). */
export const UI_CSS = `
:host{all:initial;position:fixed;inset:0 auto auto 0;z-index:2147483646;pointer-events:none;font:500 13px/1.3 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#fff;--acc:#8b5cf6;--acc-text:#fff}
*{box-sizing:border-box}
.bar{position:fixed;display:flex;align-items:center;gap:2px;padding:4px;border-radius:999px;background:rgba(14,14,20,.62);backdrop-filter:blur(16px) saturate(1.6);-webkit-backdrop-filter:blur(16px) saturate(1.6);box-shadow:0 8px 28px rgba(0,0,0,.35),inset 0 0 0 1px rgba(255,255,255,.12);opacity:0;transform:translateY(-4px);transition:opacity .18s ease,transform .18s ease;pointer-events:none}
.bar.show{opacity:1;transform:none;pointer-events:auto}
.sep{width:1px;height:18px;background:rgba(255,255,255,.18);margin:0 4px}
button{all:unset;cursor:pointer;display:inline-grid;place-items:center;min-width:30px;height:30px;padding:0 6px;border-radius:999px;color:#f4f4f6;transition:background .12s ease,color .12s ease}
button:hover{background:rgba(255,255,255,.14)}
button:focus-visible{outline:2px solid var(--acc);outline-offset:1px}
button[aria-pressed="true"]{background:var(--acc);color:var(--acc-text)}
.speed{min-width:54px;font:700 12.5px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.02em}
.tip{position:fixed;padding:5px 9px;border-radius:8px;background:rgba(10,10,14,.92);color:#fff;font-size:12px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .12s ease}
.tip.show{opacity:1}
.toast{position:fixed;padding:8px 14px;border-radius:999px;background:rgba(10,10,14,.78);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:#fff;font-weight:600;font-size:14px;box-shadow:0 6px 24px rgba(0,0,0,.35),inset 0 0 0 1px rgba(255,255,255,.12);opacity:0;transform:translate(-50%,-6px) scale(.98);transition:opacity .16s ease,transform .16s ease;pointer-events:none;white-space:nowrap}
.toast.show{opacity:1;transform:translate(-50%,0) scale(1)}
.toast .big{font:800 20px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--acc)}
.panel{position:fixed;width:300px;max-height:min(460px,calc(100vh - 24px));overflow:auto;padding:14px;border-radius:16px;background:rgba(16,16,22,.9);backdrop-filter:blur(18px) saturate(1.5);-webkit-backdrop-filter:blur(18px) saturate(1.5);box-shadow:0 18px 50px rgba(0,0,0,.45),inset 0 0 0 1px rgba(255,255,255,.12);opacity:0;transform:translateY(-4px);transition:opacity .16s ease,transform .16s ease;pointer-events:none}
.panel.show{opacity:1;transform:none;pointer-events:auto}
.panel h3{all:unset;display:flex;align-items:center;justify-content:space-between;font-weight:700;font-size:13.5px;margin-bottom:10px}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
.chip{height:26px;padding:0 10px;border-radius:999px;background:rgba(255,255,255,.08);font-size:12px;font-weight:600}
.chip[aria-pressed="true"]{background:var(--acc);color:var(--acc-text)}
.row{display:grid;grid-template-columns:86px 1fr 44px;align-items:center;gap:8px;margin:7px 0}
.row label{font-size:12px;color:rgba(255,255,255,.75)}
.row output{font:600 11.5px/1 ui-monospace,SFMono-Regular,Menlo,monospace;text-align:right;color:rgba(255,255,255,.8)}
input[type=range]{all:unset;height:18px;cursor:pointer;width:100%}
input[type=range]::-webkit-slider-runnable-track{height:4px;border-radius:4px;background:linear-gradient(90deg,var(--acc) var(--pct,50%),rgba(255,255,255,.18) var(--pct,50%))}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;margin-top:-5px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.4)}
input[type=range]:focus-visible::-webkit-slider-thumb{outline:2px solid var(--acc);outline-offset:2px}
.foot{display:flex;justify-content:space-between;align-items:center;margin-top:12px;gap:8px}
.switch{display:inline-flex;align-items:center;gap:8px;height:28px;padding:0 10px 0 6px;font-size:12px;font-weight:600}
.switch i{position:relative;width:30px;height:18px;border-radius:999px;background:rgba(255,255,255,.22);transition:background .15s ease}
.switch i::after{content:"";position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;transition:transform .15s ease}
.switch[aria-checked="true"] i{background:var(--acc)}
.switch[aria-checked="true"] i::after{transform:translateX(12px)}
.text-btn{height:28px;padding:0 10px;font-size:12px;font-weight:600;background:rgba(255,255,255,.08)}
@media (prefers-reduced-motion: reduce){.bar,.toast,.panel,.tip,button{transition:none}}
`;
