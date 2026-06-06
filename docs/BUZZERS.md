# USB Buzzers

Buzz supports USB HID buzzer controllers and falls back to plain keyboard keys.

## Supported hardware

Currently detected: USB buzzers with vendor ID `0x8088` / product ID `0x0015`
(common "LinTx"-style 4-player quiz buzzer sets that present a keyboard HID
interface). Up to **4 buzzers** (one per team). There is no LED control —
buzzers are input-only.

Want different hardware supported? See [CONTRIBUTING.md](../CONTRIBUTING.md) —
the detection lives in `apps/desktop/src-tauri/src/hid_buzzer.rs`.

## Connecting and pairing

1. Plug the receiver/buzzers in — detection is automatic and hot-plug aware
   (devices are rescanned every 2 seconds). No driver or setup needed.
2. On the **setup screen**, have each player press their buzzer once.
3. Buzzers are assigned to teams in the order you press them: the 1st
   buzzer pressed becomes **Red**, the 2nd **Blue**, the 3rd **Green**,
   the 4th **Yellow**. The pairing panel shows each paired buzzer with
   its team color.
4. Pressed in the wrong order? Click **Clear Pairings** and pair again.

## During the game

- A paired buzzer buzzes its team in while a round is armed
  (team must be locked in and not eliminated from the current round).
- ⚠️ USB buzzers only work in-game **while the Player window is open** —
  this prevents buzzing when contestants can't see anything.
- Keyboard fallback always works: keys `1` (Red), `2` (Blue),
  `3` (Green), `4` (Yellow).
