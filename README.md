# ned

ned is a personal agent.

## todo

- [ ] memory repo
- [ ] dynamic scheduling
- [ ] agent-browser
- [ ] compaction
- [ ] imessage
- [ ] tui
- [ ] sandbox
- [x] observability
- [x] store `messages` in `src/agent.ts` per session, since channels are not awaited (to allow for a synchronous chatting experience)
- [ ] set turn policy to steer
- [x] stream replies

## imessage

i want ned on imessage to feel as human as possible, by allowing him to use 90% of the features that the channel provides.

- [ ] typing indicators
- [ ] reactions
- [ ] since ned already knows what each message's ID is, he could just be instructed to add a `[reply:<id>]` at the end of a response to send it as a reply to a specific message
- [ ] multiple bubbles