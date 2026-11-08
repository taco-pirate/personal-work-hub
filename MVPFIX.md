# MVP fixes

Notes for the last pass before this version is called complete.

## Decided

- The sidebar and the page title say Actions. The set on that page is still Owed. A Task is still a Task, and a Reply is still a Reply.
- The folder steps leave the top of Home. Configure sits at the bottom of the sidebar and opens its own page. Until that check passes, Home still shows the sample week.
- The Configure page uses the Arc Install Snippet, edited for this hub. The three steps are: create `PersonalWorkHub` and the three folders, point the app at that folder, and schedule Cowork. Cowork runs at 7:50, 11:50, and 3:50 on workdays, and whenever the user runs it. Each step has a prompt the user can copy.
- Metrics is a sidebar page. Its cards are the figures the Desk and Calendar already compute: owed, Escalated, Replies, Tasks, usable time left, meetings still ahead, hours in those meetings, Focus Time left, and Uncategorized. It adds no ratio, streak, or target.
- The page header's New task creates one Task file. The user types the title. It is Drafted, with no Due, not Escalated, and no Source. It shows on the Desk and on Actions. A Reply still comes only from Cowork.
- The Arc page header replaces the plain title on Home, Actions, Calendar, Metrics, and Configure. It keeps the page title and New task. The sample people, follow, share, archive, and tab counts come off. Home's title stays the weekday and the date. The old line under it that says Sample week or PersonalWorkHub goes away. A record and a meeting keep the headers they have now.
- The main navigation is Home, Actions, Calendar, Metrics. Configure stays at the bottom, separate from those four.
- Calendar uses the Arc week calendar for the remaining workweek. It shows Meetings and usable gaps. Dragging, resizing, creating, or deleting on that grid does not change a file and does not create an Outlook event. Choosing a category stays on the meeting's own page.
- The corner mark stays the icon already there. The note says Demo Week while the sample week is showing. Once a folder is in use, the note shows the Name saved on Configure. If that Name is empty, the note says "Add your name".
- Configure has one field for the Name. The person can change it later. An empty save clears it. The app cannot read an AD account name.
- The Name is kept in `SETTINGS.md` at the root of `PersonalWorkHub`, next to `replies`, `tasks`, and `meetings`. The file holds only the Name, in the same front matter as the other files. Saving creates it if it is missing. An empty save clears the Name and leaves the file. Cowork's prompt says to leave that file alone. The same folder shows the same Name on another machine. Light and dark stay on this machine.
- While a folder is in use and the Name is empty, "Add your name" opens Configure.
- New task is available only while a chosen folder is in use. On the sample week the action is absent.

The prompt text for the three Configure steps is drafted from the product rules when this is built.
