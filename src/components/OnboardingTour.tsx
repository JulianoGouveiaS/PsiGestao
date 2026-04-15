import {useEffect, useState} from "react";
import Joyride, {CallBackProps, STATUS, Step} from "react-joyride";

const steps: Step[] = [
  {
    target: '[data-tour="sidebar"]',
    content: "Aqui está o menu principal. Navegue entre as seções do sistema.",
    placement: "right",
    disableBeacon: true,
  },
  {
    target: '[data-tour="dashboard"]',
    content: "O Dashboard mostra um resumo do seu dia: sessões, pagamentos e alertas.",
    placement: "bottom",
  },
  {
    target: '[data-tour="search"]',
    content: "Use Ctrl+K para buscar pacientes e navegar rapidamente.",
    placement: "bottom",
  },
  {
    target: '[data-tour="notifications"]',
    content: "Fique de olho nas notificações: sessões do dia, pagamentos pendentes e aniversários.",
    placement: "bottom",
  },
  {
    target: '[data-tour="theme"]',
    content: "Alterne entre modo claro e escuro conforme sua preferência.",
    placement: "bottom",
  },
];

export function OnboardingTour() {
  const [run, setRun] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("psigestao_onboarding_done");
    if (!seen) {
      const timer = setTimeout(() => setRun(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCallback = (data: CallBackProps) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      localStorage.setItem("psigestao_onboarding_done", "true");
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showSkipButton
      showProgress
      callback={handleCallback}
      locale={{
        back: "Voltar",
        close: "Fechar",
        last: "Concluir",
        next: "Próximo",
        skip: "Pular tour",
      }}
      styles={{
        options: {
          primaryColor: "hsl(199 89% 38%)",
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 12,
          padding: 20,
        },
      }}
    />
  );
}
