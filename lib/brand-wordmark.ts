/** Master geometry for the website wordmark and downloadable SVG exports. */
export const THRIVV_WORDMARK = {
  viewBox: '0 0 320 64',
  width: 320,
  height: 64,
  colors: { gold: '#D8BD7D', white: '#F4F1E8' },
  // Upright T H R I V V; the R counter uses even-odd fill. All contours fit
  // inside four units of clear space, including both complete V terminals.
  path: [
    'M4 4H46V11H28.5V60H21.5V11H4Z',
    'M60 4H67V28H93V4H100V60H93V35H67V60H60Z',
    'M116 4H137C151 4 159 11 159 22C159 31 154 37 146 39L163 60H154L140 40H123V60H116Z M123 11V33H137C147 33 152 29 152 22C152 15 147 11 137 11Z',
    'M180 4H187V60H180Z',
    'M204 4H212L230 49L248 4H256L233 60H227Z',
    'M264 4H272L290 49L308 4H316L293 60H287Z',
  ].join(' '),
} as const;
