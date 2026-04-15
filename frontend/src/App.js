import "@/App.css";
import { Analytics } from '@vercel/analytics/react';
import { WizardProvider } from '@/context/WizardContext';
import WizardShell from '@/components/WizardShell';

function App() {
  return (
    <WizardProvider>
      <WizardShell />
      <Analytics />
    </WizardProvider>
  );
}

export default App;
