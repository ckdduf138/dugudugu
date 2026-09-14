import { LobbyPage, lobbyMetadata } from "@/app/_localized/lobby";

export function generateMetadata() {
  return lobbyMetadata("ko");
}

export default function KoreanLobbyPage() {
  return <LobbyPage locale="ko" />;
}
