---
name: textual-patterns
description: Textual TUI conventions — App/Screen/Widget composition, TCSS styling, reactive attributes, message passing, workers, and pytest-based testing.
license: MIT
compatibility: both
metadata:
  audience: implementers
  type: skill
---

## What I Do

Provide Textual-specific coding conventions for the implementer subagent.
Loads on top of `python-patterns` (you must also follow those conventions).
Active when the implementer detects `textual` in project dependencies (`pyproject.toml`).

---

## Project Structure

```
  src/ (or app/)
    app.py              # Textual App subclass, entry point
    screens/            # One file per screen
      main_screen.py
      detail_screen.py
    widgets/            # Reusable custom widgets
      header.py
      status_bar.py
      data_table.py
    services/           # Business logic, API calls, data access
      api_client.py
      task_repository.py
    domain/             # Entities, value objects, domain exceptions
      models.py
    css/                # TCSS stylesheets (one per screen/widget)
      app.tcss
      main_screen.tcss
  tests/
    unit/
    integration/
    screenshots/         # pytest-textual snapshot tests
```

Key rules:
- `app.py` is thin: instantiates the App, sets CSS path, pushes initial screen
- `screens/` contain Screen subclasses — one file per screen, compose layout here
- `widgets/` contain reusable custom Widget subclasses — no business logic, no I/O
- `services/` contain async functions for API calls, DB queries, file I/O
- `domain/` has ZERO Textual imports — pure Python models and logic
- `css/` has one `.tcss` file per screen, loaded via `CSS_PATH` class variable

---

## App Conventions

### Entry Point (app.py)

```python
from __future__ import annotations
from pathlib import Path

from textual.app import App

from src.screens.main_screen import MainScreen


class TaskManagerApp(App):
    """A TUI task management application."""

    CSS_PATH = [
        Path("src/css/app.tcss"),
        Path("src/css/main_screen.tcss"),
    ]
    SCREENS: dict[str, type[MainScreen]] = {
        "main": MainScreen,
    }

    def on_mount(self) -> None:
        """Push the initial screen when the app starts."""
        self.push_screen("main")
```

- `CSS_PATH` is a list of `Path` objects — never hardcode strings, never use relative strings without `Path`
- `SCREENS` dictionary maps names to Screen classes — always type it
- `on_mount` pushes the initial screen
- Never put business logic in `App` — delegate to screens

### Modes (Light/Dark)

```python
from textual.app import App

class MyApp(App):
    # Bind a key to toggle dark mode
    BINDINGS = [
        ("ctrl+d", "toggle_dark", "Toggle dark mode"),
    ]

    def action_toggle_dark(self) -> None:
        """Toggle between light and dark themes."""
        self.theme = (
            "textual-dark" if self.theme == "textual-light"
            else "textual-light"
        )
```

- Use `self.theme` for dark/light switching — never manipulate CSS directly
- Bind `ctrl+d` as the standard dark mode toggle — match Textual conventions

---

## Screen Conventions

### Screen Structure

```python
from __future__ import annotations

from textual.app import ComposeResult
from textual.containers import Horizontal, Vertical
from textual.screen import Screen
from textual.widgets import Button, Header, Footer, Input

from src.widgets.task_list import TaskList
from src.services.task_repository import TaskRepository


class MainScreen(Screen):
    """Main screen showing the task list and quick-add input."""

    CSS_PATH = Path("src/css/main_screen.tcss")
    BINDINGS = [
        ("q", "quit", "Quit"),
        ("n", "new_task", "New task"),
        ("f", "focus_search", "Search"),
    ]

    def compose(self) -> ComposeResult:
        """Build the screen layout with child widgets."""
        yield Header(show_clock=True)
        with Horizontal(id="main-content"):
            with Vertical(id="sidebar"):
                yield Input(placeholder="Search tasks...", id="search-input")
                yield Button("+ New Task", id="new-task-btn", variant="primary")
            with Vertical(id="task-panel"):
                yield TaskList(id="task-list")
        yield Footer()

    def on_mount(self) -> None:
        """Load data when the screen is first displayed."""
        self.run_worker(self._load_tasks())

    async def _load_tasks(self) -> None:
        """Fetch tasks from the repository and update the widget."""
        repo = TaskRepository()
        tasks = await repo.list_all()
        task_list = self.query_one("#task-list", TaskList)
        await task_list.update_tasks(tasks)
```

- `compose()` yields widgets in order — use context managers (`with`) for containers
- `on_mount()` is for async setup — never do blocking I/O, use `self.run_worker()`
- CSS is loaded per-screen via `CSS_PATH` — keep it scoped
- Never store mutable state in Screen class attributes — use reactive Widgets
- Use `self.query_one()` with the explicit Widget type for type safety

### Screen Navigation

```python
class DetailScreen(Screen[dict]):
    """Screen showing task detail. Receives a task dict on push."""

    def __init__(self, task_id: str) -> None:
        super().__init__()
        self._task_id = task_id

    async def on_mount(self) -> None:
        task = await TaskRepository().get_by_id(self._task_id)
        # Populate widgets with task data


# In another screen:
def on_button_pressed(self, event: Button.Pressed) -> None:
    if event.button.id == "open-detail":
        self.app.push_screen(DetailScreen(task_id="42"))
```

- Use constructor args for screen parameters — type Screen generic is optional hint
- `self.app.push_screen()` for navigation — never instantiate screens mutably
- `self.app.pop_screen()` to go back
- `self.app.switch_screen()` to replace the current screen

---

## Widget Conventions

### Custom Widget

```python
from __future__ import annotations

from textual.app import ComposeResult
from textual.message import Message
from textual.widget import Widget
from textual.widgets import Static, Button
from textual.containers import Horizontal


class TaskCard(Widget):
    """A single task row displayed in the task list."""

    class Selected(Message):
        """Posted when a user clicks the task card."""

        def __init__(self, task_id: str) -> None:
            self.task_id = task_id
            super().__init__()

    class Deleted(Message):
        """Posted when a user deletes the task."""

        def __init__(self, task_id: str) -> None:
            self.task_id = task_id
            super().__init__()

    def __init__(self, task_id: str, title: str, done: bool) -> None:
        super().__init__()
        self._task_id = task_id
        self._title = title
        self._done = done

    def compose(self) -> ComposeResult:
        """Layout the task card."""
        with Horizontal():
            yield Static(
                f"✓ {self._title}" if self._done else f"○ {self._title}",
                id="task-title",
            )
            yield Button("Delete", id="delete-btn", variant="error")

    def on_button_pressed(self, event: Button.Pressed) -> None:
        """Handle button clicks and post custom messages."""
        if event.button.id == "delete-btn":
            self.post_message(self.Deleted(self._task_id))
        else:
            self.post_message(self.Selected(self._task_id))
```

- Custom Widgets subclass `textual.widget.Widget`
- Define custom Messages as inner classes extending `Message`
- Custom messages carry data in `__init__` using instance attributes (not tuples/dicts)
- Always call `super().__init__()` in message `__init__`
- Use `self.post_message()` to bubble events up — never call parent methods directly
- Widgets are responsible for their own rendering — use `compose()` for child layout

### Built-in Widgets

Always map Textual built-ins to the correct type via `query_one`:

```python
from textual.widgets import Input, RichLog, DataTable

search = self.query_one("#search", Input)
log = self.query_one("#output", RichLog)
table = self.query_one("#results", DataTable)
```

- Never use `self.query_one("#id")` without the type argument — defeats type safety
- Widget IDs are kebab-case: `search-input`, `task-list`, `new-task-btn`

---

## CSS Styling (TCSS)

### Per-Screen Stylesheet

```css
/* src/css/main_screen.tcss */
MainScreen {
    /* Only `align` works on the Screen itself */
}

#main-content {
    height: 1fr;
}

#sidebar {
    width: 30%;
    border: solid $accent;
    padding: 1 2;
}

#search-input {
    margin-bottom: 1;
}

#task-panel {
    width: 1fr;
    padding: 1 2;
}

TaskCard {
    height: 3;
    border-bottom: solid $panel-darken-2;
}

TaskCard:hover {
    background: $panel-darken-1;
}

TaskCard.--done {
    tint: $text-disabled;
}

Button#delete-btn {
    dock: right;
}
```

- Use `$design-token-variables` for colors — never hardcode hex values
- Widget classes in TCSS match the Python class name (e.g., `TaskCard`)
- IDs in TCSS match the Python widget ID (e.g., `#search-input`)
- `1fr` means "take remaining space" (use instead of percentages)
- Pseudo-classes: `:hover`, `:focus`, `:focus-within`
- Toggle classes: `.--done`, `.--selected` — applied via `add_class`/`remove_class` in Python

### Design Token Variables

Textual provides these built-in variables. Always use them:

| Variable | Use |
|----------|-----|
| `$primary` | Primary accent color |
| `$secondary` | Secondary accent color |
| `$accent` | Borders, separators |
| `$text` | Primary text |
| `$text-disabled` | Disabled/muted text |
| `$panel` | Background color |
| `$panel-darken-1` | Slightly darker panel |
| `$success` | Success/positive actions |
| `$warning` | Warnings |
| `$error` | Errors/destructive actions |
| `$surface` | Elevated surface (cards, dialogs) |

- Never hardcode colors like `#ff0000` — use `$error` instead
- Use `tint:` for coloring text/icons, `background:` for widgets

---

## Reactive System

### Reactive Attributes

```python
from textual.reactive import reactive
from textual.widget import Widget


class TaskCounter(Widget):
    """Displays a live count of tasks."""

    count: reactive[int] = reactive(0)
    label: reactive[str] = reactive("tasks")

    def watch_count(self, old: int, new: int) -> None:
        """Called whenever count changes — update the display."""
        self.update(f"{new} {self.label}")

    def watch_label(self, old: str, new: str) -> None:
        """Called whenever label changes."""
        self.update(f"{self.count} {new}")
```

- Use `reactive` for Widget state that triggers re-render
- Watcher methods follow `watch_{attribute_name}(self, old, new)` pattern
- Never manually call re-render methods — let the reactive system handle it
- Use `reactive(init, always_update=False)` — set `always_update=True` only when needed
- Reactive values trigger watchers AND CSS auto-update

### Validating Reactives

```python
from textual.reactive import reactive


class ProgressBar(Widget):
    percentage: reactive[float] = reactive(0.0)

    def validate_percentage(self, value: float) -> float:
        """Clamp percentage to 0-100 range."""
        return max(0.0, min(100.0, value))
```

- Validators follow `validate_{attribute_name}(self, value)` pattern
- They must return the (possibly modified) value
- Raise `ValueError` to reject the value entirely

---

## Message Passing

### Custom Messages

```python
from textual.message import Message


class TaskList(Widget):
    class TaskSelected(Message, bubble=True):
        """Bubbles up to the parent Screen."""

        def __init__(self, task_id: str, task_title: str) -> None:
            self.task_id = task_id
            self.task_title = task_title
            super().__init__()

    class TaskDeleted(Message, bubble=True):
        def __init__(self, task_id: str) -> None:
            self.task_id = task_id
            super().__init__()


# In the parent Screen:
class MainScreen(Screen):
    def on_task_list_task_selected(self, event: TaskList.TaskSelected) -> None:
        """Handle task selection from the task list widget."""
        self.app.push_screen(
            DetailScreen(task_id=event.task_id)
        )
```

- `Message` subclassed with `bubble=True` to propagate up the widget tree
- Handler method naming: `on_{widget_class_snake}_{message_class_snake}(self, event)`
- Messages carry data as typed instance attributes — never as generic dicts
- Use `self.post_message()` inside the Widget
- Use `self.app.post_message()` only for app-wide events (e.g., `app.post_message(ReloadData())`)
- Never update sibling widgets directly — post a message and let the parent mediate

### Built-in Message Handlers

```python
def on_button_pressed(self, event: Button.Pressed) -> None:
    """All button clicks arrive here — filter by button.id."""
    ...

def on_input_changed(self, event: Input.Changed) -> None:
    """Called on every keystroke in an Input widget."""
    ...

def on_input_submitted(self, event: Input.Submitted) -> None:
    """Called when Enter is pressed in an Input widget."""
    ...

def on_data_table_row_selected(self, event: DataTable.RowSelected) -> None:
    """A row was selected in a DataTable."""
    ...
```

---

## Async Workers

Textual is fully async. Never block the event loop.

```python
from textual.worker import Worker, WorkerState


class SearchScreen(Screen):
    def on_mount(self) -> None:
        """Start a background search when the screen loads."""
        self.run_worker(self._fetch_results(), exclusive=True)

    @work(exclusive=True, group="search")
    async def _fetch_results(self) -> None:
        """Fetch search results from the API."""
        results = await api_client.search(self._query)
        widget = self.query_one("#results", ResultList)
        await widget.update_results(results)

    def on_input_changed(self, event: Input.Changed) -> None:
        """Re-trigger search on each keystroke, debounced by worker."""
        self._query = event.value
        self.run_worker(self._fetch_results(), exclusive=True)
```

- Use `self.run_worker()` for any async task — never `asyncio.create_task()` directly
- `exclusive=True` cancels any previous worker in the same group — good for search/autocomplete
- Use `@work` decorator for worker methods — enables `group` and `exclusive` parameters
- Never `await asyncio.sleep()` for long operations — use textual timers or workers

### Worker Error Handling

```python
@work(exclusive=True)
async def _dangerous_operation(self) -> None:
    try:
        result = await risky_api_call()
    except ApiError as exc:
        self.notify(
            f"Operation failed: {exc}",
            severity="error",
            timeout=5,
        )
    else:
        self.notify("Operation completed!", severity="information")
```

- Wrap worker logic in try/except — unhandled exceptions crash the app
- Use `self.notify()` for user-facing errors — built-in notification system
- Severity: `"information"`, `"warning"`, `"error"`

---

## Testing

### Framework

- **Test runner**: `pytest`
- **Textual testing**: `pytest-textual` (install: `pip install pytest-textual`)
- **Async fixtures**: `pytest-asyncio`
- **Snapshot testing**: `pytest-textual` provides `snap_compare` for visual regression

### Test Setup

```python
# tests/conftest.py
import pytest
from textual.app import App


@pytest.fixture
async def app():
    """Create a fresh app instance for each test."""
    app = TaskManagerApp()
    async with app.run_test() as pilot:
        yield pilot
```

### Widget Tests

```python
# tests/unit/test_task_card.py
import pytest
from src.widgets.task_card import TaskCard


async def test_task_card_renders_title():
    """TaskCard should display the task title."""
    async with TaskCard(task_id="1", title="Test task", done=False).run_test() as pilot:
        title_widget = pilot.app.query_one("#task-title")
        assert "○ Test task" in str(title_widget.render())


async def test_task_card_posts_selected_message():
    """Clicking the card should post a Selected message."""
    messages: list[TaskCard.Selected] = []

    async with TaskCard(task_id="42", title="Click me", done=False).run_test() as pilot:
        # Subscribe to messages before clicking
        with pilot.app.capture_messages(TaskCard.Selected) as captured:
            await pilot.click("#task-title")
        messages = captured
        assert len(messages) == 1
        assert messages[0].task_id == "42"
```

- Use `.run_test()` context manager — creates an isolated app with the widget mounted
- `pilot.click(selector)` simulates mouse clicks
- `pilot.press("key")` simulates keyboard input
- `capture_messages(MessageClass)` captures messages posted during the context block
- Never access private widget internals — test via public interface and messages

### Screen Tests

```python
# tests/integration/test_main_screen.py
import pytest
from src.app import TaskManagerApp


async def test_main_screen_loads_tasks_on_mount():
    """MainScreen should load and display tasks when mounted."""
    async with TaskManagerApp().run_test() as pilot:
        # Wait for the worker to finish loading
        await pilot.pause()
        task_list = pilot.app.query_one("#task-list")
        task_list_widget = pilot.app.query_one("#task-list", TaskList)
        assert task_list_widget is not None


async def test_search_input_triggers_filtering():
    """Typing in the search input should filter the task list."""
    async with TaskManagerApp().run_test() as pilot:
        search_input = pilot.app.query_one("#search-input", Input)
        await pilot.click("#search-input")
        await pilot.press(*"buy groceries")
        await pilot.pause()
        # Verify filtered results
        task_list = pilot.app.query_one("#task-list", TaskList)
        assert task_list.filtered_count > 0
```

- `pilot.press(*"string")` types each character individually
- `await pilot.pause()` waits for pending async operations
- `await pilot.pause(0.5)` pauses for a duration in seconds

### Snapshot Tests

```python
# tests/screenshots/test_screens.py
from pathlib import Path
from pytest_textual.plugin import snap_compare


def test_main_screen_appearance(snap_compare):
    """Visual regression test for the main screen."""
    assert snap_compare(
        Path("src/app.py"),
        press=["ctrl+d"],  # Toggle dark mode before screenshot
    )
```

### Run Commands

```bash
pytest tests/ -v                          # Run all tests
pytest tests/ -v -k "test_task_card"     # Run matching tests
pytest tests/ --snapshot-update          # Update snapshot references
pytest tests/ -v --cov=src --cov-report=term  # With coverage
```

---

## Common Patterns

### Container/Presentational Split

```python
# Container Widget — handles data and logic
class TaskListContainer(Widget):
    tasks: reactive[list[Task]] = reactive(list, init=False)

    def on_mount(self) -> None:
        self.run_worker(self._load())

    @work(exclusive=True)
    async def _load(self) -> None:
        repo = TaskRepository()
        self.tasks = await repo.list_all()

    def watch_tasks(self, old, new) -> None:
        task_view = self.query_one("#task-view", TaskView)
        task_view.render_tasks(new)


# Presentational Widget — pure rendering
class TaskView(Widget):
    def render_tasks(self, tasks: list[Task]) -> None:
        """Render the task list. Called by the container."""
        ...
```

- Container Widget handles data fetching, worker orchestration, and message mediation
- Presentational Widget receives data via method calls and renders
- Presentational Widgets can be tested in isolation with dummy data

### Modal Dialogs

```python
class ConfirmDeleteScreen(Screen[bool]):
    """Modal screen that returns True if confirmed, False if cancelled."""

    def compose(self) -> ComposeResult:
        yield Static("Are you sure you want to delete this task?")
        with Horizontal():
            yield Button("Cancel", variant="default", id="cancel-btn")
            yield Button("Delete", variant="error", id="confirm-btn")

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "confirm-btn":
            self.dismiss(True)
        else:
            self.dismiss(False)


# Usage:
async def action_delete_task(self) -> None:
    confirmed = await self.app.push_screen_wait(ConfirmDeleteScreen())
    if confirmed:
        await self._delete_current_task()
```

- Modal screens use `self.dismiss(result)` to return a value
- The caller uses `await self.app.push_screen_wait(screen)` to block and get the result
- Return type is typed via `Screen[T]` generic

### Keybinding Convention

```python
BINDINGS = [
    ("q", "quit", "Quit the application"),
    ("ctrl+c", "quit", "Quit"),
    ("j,down", "cursor_down", "Move down"),
    ("k,up", "cursor_up", "Move up"),
    ("enter", "select", "Select item"),
    ("ctrl+s", "save", "Save current"),
    ("ctrl+f", "focus_search", "Focus search bar"),
]
```

- Standard navigation: `j`/`k` or `down`/`up` for list movement
- Standard actions: `enter` for select, `ctrl+s` for save, `ctrl+f` for find
- Standard quit: `q` and `ctrl+c`
- Description is the third element — used for footer display
- Comma-separated keys trigger the same action

### DataTable Patterns

```python
from textual.widgets import DataTable


class ResultsTable(Widget):
    def on_mount(self) -> None:
        table = self.query_one("#data", DataTable)
        table.add_columns("ID", "Title", "Status", "Created")
        table.cursor_type = "row"
        table.zebra_stripes = True

    def populate(self, rows: list[dict]) -> None:
        table = self.query_one("#data", DataTable)
        table.clear()
        for row in rows:
            table.add_row(
                row["id"],
                row["title"],
                row["status"],
                row["created_at"],
                key=row["id"],  # Stable key for updates/deletion
            )

    def on_data_table_row_selected(self, event: DataTable.RowSelected) -> None:
        """Row selected — navigate to detail."""
        row_key = event.row_key.value
        self.post_message(TaskSelected(task_id=row_key))
```

- Always use `key=` for stable row identification
- `cursor_type = "row"` highlights the entire row
- `zebra_stripes = True` for alternating row colors
- Use `table.clear()` before re-populating

---

## Anti-patterns to Avoid

- **Blocking I/O in `on_mount` or `compose`**: Always use `run_worker` or async methods. Blocking freezes the UI
- **Business logic in Widgets**: Widgets handle rendering and user input. Data access, validation, and business rules go in `services/` or `domain/`
- **Global mutable state**: Don't use module-level variables for app state. Pass data through messages or constructor injection
- **`app.query_one()` in services**: Services should never reference the DOM. Post messages or return data — let Widgets/Screens decide what to render
- **Direct attribute mutation on sibling widgets**: Use messages. `widget.sibling.value = x` creates hidden coupling
- **Missing `super().__init__()` in Message subclasses**: Textual's message system needs the parent init to set up bubbling
- **Hardcoded CSS colors**: Always use `$design-tokens`. Hardcoded `#ff0000` ignores the user's theme
- **`asyncio.create_task()` instead of `run_worker()`**: Workers integrate with Textual's lifecycle (auto-cancel on unmount)
- **Long-running sync methods**: Any function over ~10ms of CPU should be offloaded to a worker
- **Missing `key=` in DataTable rows**: Without stable keys, re-ordering deletes/adds rows breaks cursor position
- **Unhandled exceptions in workers**: Always wrap worker bodies in try/except — an unhandled exception terminates the app
- **`print()` for debugging**: Use Textual's `self.log()`, `self.notify()`, or `self.bell()`. Use `textual devtools` for a console
- **Committing `.tcss` files without theme token variables**: Always reference `$variables`, never raw colors or hardcoded values

---

## CSS Anti-patterns

- **`width: 100%` — use `width: 1fr` instead**. Percentages behave unpredictably in scrollable containers
- **`height: auto` — Textual doesn't support it**. Use `height: auto` as an implicit default if not set, or use `text-align` with `content-align` for sizing
- **`margin: 0` — use `margin: 0 0`**. TCSS requires explicit horizontal and vertical values for margin and padding
- **Missing `$` prefix on design tokens**: `color: $error` not `color: error` — without `$` it's treated as a literal color name
