import './App.scss';
import './locales/i18n';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/en';
import ProgressBar from './components/ProgressBar';
import { useTheme } from './hooks';

export default function App() {
  useTheme();
  return <ProgressBar />;
}
