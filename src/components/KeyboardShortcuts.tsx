import {useEffect} from "react";
import {useNavigate} from "react-router-dom";

export function KeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      if (e.altKey && e.key === "n") {
        e.preventDefault();
        navigate("/agenda");
      }
      if (e.altKey && e.key === "p") {
        e.preventDefault();
        navigate("/patients");
      }
      if (e.altKey && e.key === "d") {
        e.preventDefault();
        navigate("/dashboard");
      }
      if (e.altKey && e.key === "f") {
        e.preventDefault();
        navigate("/finances");
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [navigate]);

  return null;
}
