/** Lightweight chameleon artwork, available in HTML before any image request. */
export function DuguWaiting() {
  return (
    <svg aria-hidden="true" viewBox="0 0 240 190" className="dugu-waiting mx-auto h-40 w-52" fill="none">
      <ellipse cx="123" cy="173" rx="82" ry="7" fill="var(--ink)" opacity=".07" />
      <g className="dugu-waiting-body" strokeLinecap="round" strokeLinejoin="round">
        <path d="M151 145C181 176 219 168 219 143C219 120 188 115 177 132C164 152 195 163 200 146C203 138 193 134 189 140" stroke="var(--candy-coral)" strokeWidth="13" />
        <path d="M80 113C66 133 68 153 86 164C105 175 145 171 160 154C170 140 163 120 147 112Z" fill="var(--candy-mint)" />
        <ellipse cx="119" cy="144" rx="25" ry="24" fill="var(--candy-lemon)" opacity=".6" />
        {/* A single casque and projecting eye turrets distinguish Dugu from a dinosaur. */}
        <path d="M92 53C108 37 121 14 137 18C148 21 149 48 160 62Z" fill="var(--candy-mint)" />
        <path d="M107 43Q123 21 135 23" stroke="var(--surface)" strokeWidth="4" opacity=".4" />
        <path d="M59 86C58 59 83 46 116 46C146 45 172 64 176 88C184 113 164 135 137 138C107 143 71 128 61 111C56 102 55 94 59 86Z" fill="var(--candy-mint)" />
        {[76, 151].map((x) => (
          <g key={x}>
            <ellipse cx={x} cy="82" rx="27" ry="30" fill="var(--candy-mint)" stroke="var(--ink)" strokeOpacity=".12" strokeWidth="2" />
            <ellipse cx={x} cy="84" rx="20" ry="23" fill="var(--surface)" />
            <g className="dugu-waiting-eyes">
              <ellipse cx={x + 3} cy="91" rx="11" ry="13" fill="var(--ink)" />
              <circle cx={x + 6} cy="87" r="3.5" fill="var(--surface)" />
            </g>
            <path d={`M${x - 21} 78C${x - 18} 50 ${x + 19} 50 ${x + 22} 78Z`} fill="var(--candy-mint)" />
            <path d={`M${x - 19} 78H${x + 20}`} stroke="var(--ink)" strokeOpacity=".15" strokeWidth="2" />
          </g>
        ))}
        <path d="M94 117Q114 125 136 116" stroke="var(--ink)" strokeWidth="2.5" />
        <path d="M100 106h.1m15 1h.1" stroke="var(--ink)" strokeOpacity=".35" strokeWidth="3" />
        <path d="m151 108 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" fill="var(--candy-lemon)" />
        <path d="M87 148C91 139 87 128 78 121" stroke="var(--candy-mint)" strokeWidth="17" />
        <path d="M69 115Q76 108 82 117L85 123Q76 133 69 124Z" fill="var(--candy-mint)" stroke="var(--ink)" strokeOpacity=".12" strokeWidth="2" />
        <path d="M153 128Q160 148 145 150" stroke="var(--candy-mint)" strokeWidth="15" />
        <path d="M78 165q9-10 18 0m-8-1 4 5" stroke="var(--candy-mint)" strokeWidth="10" />
        <path className="dugu-waiting-foot" d="M136 166q10-12 20-1m-9-1 4 5" stroke="var(--candy-mint)" strokeWidth="10" />
      </g>
    </svg>
  );
}
