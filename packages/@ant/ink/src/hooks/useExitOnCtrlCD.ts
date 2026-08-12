/**
 * Minimal stub of useExitOnCtrlCD + useExitOnCtrlCDWithKeybindings.
 *
 * The original hooks depend on the keybinding system and useApp() exit.
 * This stub provides the same interface with simplified Ctrl+C/D handling
 * via useInput, suitable for the standalone @anthropic/ink package.
 */

import { useCallback, useState } from 'react'
import useApp from './use-app.js'
import { useDoublePress } from './useDoublePress.js'
import useInput from './use-input.js'

export type ExitState = {
  pending: boolean
  keyName: 'Ctrl-C' | 'Ctrl-D' | null
}

/**
 * Stub that provides ExitState for Ctrl+C/D double-press UI.
 * In the standalone package, this uses useInput directly rather than the
 * keybinding system.
 */
export function useExitOnCtrlCDWithKeybindings(
  onExit?: () => void,
  onInterrupt?: () => boolean,
  isActive: boolean = true,
): ExitState {
  const { exit } = useApp()
  const [exitState, setExitState] = useState<ExitState>({
    pending: false,
    keyName: null,
  })

  const exitFn = useCallback(() => {
    ;(onExit ?? exit)()
  }, [onExit, exit])

  const handleCtrlC = useDoublePress(
    pending => setExitState({ pending, keyName: pending ? 'Ctrl-C' : null }),
    exitFn,
  )

  const handleCtrlD = useDoublePress(
    pending => setExitState({ pending, keyName: pending ? 'Ctrl-D' : null }),
    exitFn,
  )

  const handleInput = useCallback(
    (_input: string, key: { ctrl?: boolean; name?: string }) => {
      if (!isActive) return
      if (key.ctrl && key.name === 'c') {
        if (!onInterrupt?.()) handleCtrlC()
      } else if (key.ctrl && key.name === 'd') {
        handleCtrlD()
      }
    },
    [isActive, onInterrupt, handleCtrlC, handleCtrlD],
  )

  useInput(handleInput, { isActive })

  return exitState
}
