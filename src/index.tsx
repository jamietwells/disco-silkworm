import { render } from 'react-dom';
import App from './App';
import './index.css';
import registerServiceWorker from './serviceWorker';

render(
  <App />,
  document.getElementById('root') as HTMLElement
);
registerServiceWorker();