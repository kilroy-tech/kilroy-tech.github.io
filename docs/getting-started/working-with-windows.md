# Working with Windows

Kilroy's dashboard uses a free-floating window system for displaying process diagrams. Each diagram opens as an independent window that you can move, resize, scale, and arrange however you like.

---

## Opening and Closing Diagrams

Click any diagram name in the **Installed** panel (left sidebar) to open it as a window on the dashboard. Click the name again to close it.

Every window has a **traffic-light button group** in the top-left corner of its title bar — three colored circles, similar to macOS window controls.

---

## Traffic Light Buttons

### Red — Stop
Sends a stop signal to the running application associated with this diagram. This button is only active for diagrams whose app implements a stop workflow (`ui_stop_wf`). If the button is grey, the app does not support this action.

### Yellow — Close
Closes the window and removes it from the dashboard. The diagram can be reopened from the sidebar. A brief genie animation plays as the window collapses away.

### Green — Zoom
Expands the window to its natural content size. Click again to restore the previous (smaller) size. The zoom button remembers both the zoomed and unzoomed positions independently, so you can freely toggle between them after moving or resizing in either state.

---

## Moving Windows

Click and drag the **title bar** to move a window anywhere on the dashboard. Windows can be freely positioned and will not snap to a grid.

Touch dragging is also supported on tablet/touch devices.

---

## Resizing Windows

Drag the **resize handle** in the bottom-right corner of any window to resize it freely.

### Scale Mode (Option/Alt + Resize)

Hold the **Option key** (macOS) while dragging the resize handle to enter **scale mode**. In scale mode, shrinking the window proportionally scales its content down so everything remains visible — rather than clipping content at the window edge. This is useful for monitoring multiple diagrams on a single screen.

Scale mode state is preserved in the page URL, so bookmarking or sharing the URL restores scaled windows correctly.

---

## Automatic Sizing

When a diagram is first opened, its window automatically sizes itself to fit the diagram's content — no manual sizing needed. If a diagram's content loads asynchronously (common for AI pipeline agents), the window adjusts to the final content size once loading completes.

---

## Arranging Multiple Windows

When two or more windows are open, two arrangement buttons appear at the bottom of the left sidebar:

### Tile Windows (`⊞`)
Rearranges all open windows into rows packed from left to right, tallest windows first. Each window keeps its current size — only positions are changed.

### Stack Windows (`▤`)
Cascades all open windows from the top-left, each offset diagonally, in the order they were opened. Useful for quickly resetting a cluttered workspace.

---

## Bringing a Window to the Front

Click anywhere on a window to bring it to the front. Window stacking order is managed automatically.

---

## URL Layout Persistence

The dashboard URL encodes every open window's position, size, and scale state as query parameters. You can:

- **Bookmark** the current layout and restore it exactly by revisiting the bookmark
- **Share** the URL with another user on the same Kilroy instance to open the same set of diagrams
- **Reload** the page without losing your window arrangement

---

## Opening a Diagram in a Standalone Window

Click the **arrow icon** (↗) in any window's title bar to open that diagram in a separate browser window or tab, without the sidebar or dashboard chrome. This is useful for dedicating a display to a single diagram.
