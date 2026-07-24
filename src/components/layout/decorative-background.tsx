export function DecorativeBackground() {
  return (
    <div
      data-swirly-background
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden text-primary"
      aria-hidden="true"
    >
      <svg
        className="absolute -top-24 -right-48 h-[34rem] w-[46rem] max-w-none opacity-[0.13]"
        viewBox="0 0 760 560"
        fill="none"
      >
        <path
          d="M48 335c104-198 247-52 301-194 38-99-90-149-159-66-74 89 32 250 174 221 147-30 142-206 284-226"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M24 386c115-161 237-35 365-97 93-45 72-158 169-180 61-14 121 17 170 78"
          stroke="currentColor"
          strokeWidth="0.9"
          strokeLinecap="round"
        />
        <path
          d="M115 494c41-121 169-82 242-132 99-67 54-183 169-221 61-20 119 6 165 43"
          stroke="currentColor"
          strokeWidth="1.15"
          strokeLinecap="round"
        />
      </svg>
      <svg
        className="absolute -bottom-32 -left-56 h-[38rem] w-[52rem] max-w-none rotate-[-8deg] opacity-[0.1]"
        viewBox="0 0 840 620"
        fill="none"
      >
        <path
          d="M52 458c118-39 93-174 228-196 132-22 171 133 303 61 100-54 38-176 177-236"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path
          d="M18 516c167-23 160-152 276-169 125-19 173 104 278 62 119-47 86-193 232-248"
          stroke="currentColor"
          strokeWidth="0.9"
          strokeLinecap="round"
        />
        <path
          d="M116 579c120-29 121-123 225-145 132-29 182 75 284 38 89-33 91-124 178-171"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
