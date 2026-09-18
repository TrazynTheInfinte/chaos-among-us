// Runs the bot test suite with JAVA_HOME's bin directory put first on PATH
// for this process only. The RTDB emulator needs JDK 21+; on this machine an
// older Oracle Java 8 install sits in the System PATH, which Windows always
// puts ahead of the User PATH, so a plain `java` lookup finds the wrong one
// regardless of User PATH ordering. Going through JAVA_HOME instead of a
// hardcoded install path keeps this portable to other machines/JDK installs.

import { spawnSync } from 'node:child_process'
import path from 'node:path'

const env = { ...process.env }

if (env.JAVA_HOME) {
  const jdkBin = path.join(env.JAVA_HOME, 'bin')
  env.PATH = `${jdkBin}${path.delimiter}${env.PATH ?? ''}`
}

// Passed as a single string (not an args array) because shell:true on Windows
// re-quotes array elements in a way that splits "vitest run" into two
// arguments instead of emulators:exec's one expected script argument.
const result = spawnSync(
  'npx firebase emulators:exec --project demo-chaos-among-us "vitest run"',
  { stdio: 'inherit', shell: true, env },
)

process.exit(result.status ?? 1)
