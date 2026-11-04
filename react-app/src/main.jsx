import { createRoot } from 'react-dom/client';

// Two screens, each with its own global stylesheet, so load only the one in use.
//   /#withdrawal → Withdrawal review     anything else → Transfer request
const load = location.hash === '#withdrawal'
  ? () => import('./withdrawal/WithdrawalReview.jsx')
  : () => import('./App.jsx');

load().then(({ default: Screen }) => createRoot(document.getElementById('root')).render(<Screen />));
window.addEventListener('hashchange', () => location.reload());
