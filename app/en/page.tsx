import { LobbyPage, lobbyMetadata } from "@/app/_localized/lobby";

export function generateMetadata() {
  return lobbyMetadata("en");
}

export default function EnglishLobbyPage() {
  return <LobbyPage locale="en" />;
}
