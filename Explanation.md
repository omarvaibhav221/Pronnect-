# Explanation

The hardest problem was the role-filtered real-time feed with missed-event
catchup, because those two requirements pull in opposite directions: the
live path wants to be fast and push-based, while the catchup path must be
correct and database-backed, and both have to agree on exactly the same
role-scoping logic or a user would see different data depending on whether
they were online when an event happened.

I solved it by making the database the single source of truth and treating
Socket.io purely as a delivery mechanism on top of it. Every status change
writes one `ActivityLog` row, then `recordActivity` fans that same row out
to up to four rooms — the project's room, `feed:admin`, the owning PM's
room, and the assignee's private room — so "who sees what" is just room
membership decided at connect/watch time, not per-event filtering logic
duplicated in multiple places. The `activity:catchup` handler runs the
identical role-scoped Prisma query used to seed each dashboard's initial
feed, so reconnecting after being offline five minutes or five hours
produces the same result.

If I did it differently, I'd push a fresh JWT to the live socket on token
refresh instead of only re-authenticating on the next full connect — right
now a long session can outlive its original handshake token before the
socket itself notices.
