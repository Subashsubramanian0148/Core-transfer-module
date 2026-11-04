import './withdrawal.css';

const money = n => (n < 0 ? '−' : '') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const REQUEST = {
  plan: 'Vanguard 401(k) Plan',
  type: 'In-Service · One time payment',
  amountMode: 'Entire balance',
  gross: 3000,
  deductions: [
    { label: 'Federal tax', rate: '20%', amount: 600 },
    { label: 'State tax', rate: '0%', amount: 0 },
    { label: 'Early withdrawal penalty', rate: '10%', amount: 300 },
    { label: 'ETF fee', amount: 5 },
  ],
  payment: [
    ['Method', 'Direct deposit (ETF)'],
    ['Bank', 'Chase Bank · Checking ••••0093'],
    ['Routing', '021000021'],
    ['Details from', 'Employee records'],
  ],
  sources: [
    { name: 'KEIFER', gross: 1200, net: 838 },
    { name: 'SEAS001', gross: 1000, net: 698.33 },
    { name: 'INVST072', gross: 800, net: 558.67 },
  ],
};

const NAV = ['Dashboard', 'Plan Config', 'Employees', 'Payroll', 'Transaction', 'Others'];

export default function WithdrawalReview() {
  const r = REQUEST;
  const net = r.gross - r.deductions.reduce((a, d) => a + d.amount, 0);
  const penalty = r.deductions.find(d => d.label === 'Early withdrawal penalty');
  const sum = k => r.sources.reduce((a, s) => a + s[k], 0);

  return (
    <div className="app">
      <nav className="rail" aria-label="Primary">
        <div className="logo" aria-hidden="true">C</div>
        {NAV.map(n => (
          <a key={n} href={n === 'Transaction' ? '#' : undefined} className={'nav' + (n === 'Transaction' ? ' on' : '')}>{n}</a>
        ))}
      </nav>

      <div className="main">
        <header className="topbar">
          <div className="brand">
            <svg viewBox="0 0 44 44" aria-hidden="true"><ellipse cx="17" cy="22" rx="12" ry="20" fill="#0B6FD3" /><path d="M30 4c6 5 9 11 9 18s-3 13-9 18" stroke="#0B9BE0" strokeWidth="4" fill="none" strokeLinecap="round" /></svg>
            Galileo
          </div>
          <div className="avatar-s" aria-label="Account">AR</div>
        </header>

        <div className="page">
          <aside className="emp" aria-label="Employee details">
            <h2>Employee details</h2>
            <div className="emp-card">
              <div className="emp-av" aria-hidden="true">KT</div>
              <div className="emp-n">Kevin Thomas</div>
              <span className="chip">Terminated</span>
              <dl className="emp-dl">
                <div><dt>SSN</dt><dd className="num">AAA-GG-XXXX</dd></div>
                <div><dt>Company</dt><dd>Family Health of Five Ltd.</dd></div>
              </dl>
              <button className="link" type="button">More info</button>
            </div>
          </aside>

          <main className="content">
            <div className="ph2">
              <div><h1>Review withdrawal request</h1><p>Check the details below, then submit.</p></div>
            </div>
            <div className="bar">
              <button className="btn tert" type="button">Save as draft</button>
              <div className="r">
                <a className="btn" href="#">Back</a>
                <button className="btn pri" type="button">Submit</button>
              </div>
            </div>

            <div className="ctx">
              <span>Plan <b>{r.plan}</b></span>
              <span>Type <b>{r.type}</b></span>
              <span>Amount <b>{r.amountMode}</b></span>
            </div>

            <section className="hero num" aria-label="Withdrawal amount">
              <div className="hero-net">
                <span className="lbl">Net to participant</span>
                <span className="amt">{money(net)}</span>
                <span className="of">from a {money(r.gross)} withdrawal</span>
              </div>
              <div className="hero-calc">
                <div className="row"><span>Gross withdrawal</span><span>{money(r.gross)}</span></div>
                {r.deductions.map(d => (
                  <div className="row" key={d.label}>
                    <span>{d.label}{d.rate && <span className="m">{d.rate}</span>}</span>
                    <span>−{money(d.amount)}</span>
                  </div>
                ))}
                <div className="row tot"><span>Net</span><span>{money(net)}</span></div>
              </div>
            </section>

            {penalty && penalty.amount > 0 && (
              <div className="pen" role="note">
                <span className="warn-dot" aria-hidden="true">!</span>
                <span>A {penalty.rate} early withdrawal penalty ({money(penalty.amount)}) applies. The participant and admin have been notified.</span>
              </div>
            )}

            <div className="two">
              <section className="card">
                <div className="card-h"><h3>Payment</h3></div>
                <div className="cb">
                  {r.payment.map(([k, v]) => <div className="row" key={k}><span>{k}</span><b>{v}</b></div>)}
                </div>
              </section>
              <section className="card">
                <div className="card-h"><h3>Sources</h3><span className="lbl">Pro-rata · Tax code 1 (Roth &amp; Non-Roth)</span></div>
                <div className="cb">
                  <table className="srct num">
                    <thead><tr><th>Source</th><th>Gross</th><th>Net</th></tr></thead>
                    <tbody>
                      {r.sources.map(s => <tr key={s.name}><td>{s.name}</td><td>{money(s.gross)}</td><td>{money(s.net)}</td></tr>)}
                    </tbody>
                    <tfoot><tr><td>Total</td><td>{money(sum('gross'))}</td><td>{money(sum('net'))}</td></tr></tfoot>
                  </table>
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
