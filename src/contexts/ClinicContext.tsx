import {createContext, type ReactNode, useContext, useState} from "react";
import type {ClinicMember} from "@/hooks/useClinicMembers";

interface ClinicContextValue {
  /** Currently selected psychologist the admin is managing (null = show all) */
  selectedMember: ClinicMember | null;
  setSelectedMember: (member: ClinicMember | null) => void;
  /** All active members loaded by ClinicLayout */
  members: ClinicMember[];
  setMembers: (members: ClinicMember[]) => void;
}

const ClinicContext = createContext<ClinicContextValue>({
  selectedMember: null,
  setSelectedMember: () => {},
  members: [],
  setMembers: () => {},
});

export function ClinicProvider({ children }: { children: ReactNode }) {
  const [selectedMember, setSelectedMember] = useState<ClinicMember | null>(null);
  const [members, setMembers] = useState<ClinicMember[]>([]);

  return (
    <ClinicContext.Provider value={{ selectedMember, setSelectedMember, members, setMembers }}>
      {children}
    </ClinicContext.Provider>
  );
}

export function useClinicContext() {
  return useContext(ClinicContext);
}

