import "@/App.css";
import { WizardProvider } from '@/context/WizardContext';
import WizardShell from '@/components/WizardShell';

function App() {
  return (
    <WizardProvider>
      <WizardShell />
    </WizardProvider>
  );
}

export default App;
