# ned

ned is a personal agent.

## todo

- [ ] memory repo
- [ ] dynamic scheduling
- [ ] agent-browser
- [ ] compaction
- [x] imessage
- [x] tui
- [ ] sandbox
- [x] observability
- [x] store `messages` in `src/agent.ts` per session, since channels are not awaited (to allow for a synchronous chatting experience)
- [ ] tools
- [ ] skills

## imessage

i want ned on imessage to feel as human as possible, by allowing him to use 90% of the features that the channel provides.

- [x] outbound typing indicators
- [ ] inbound reactions
- [x] outbound reactions
- [x] inbound replies
- [x] outbound replies
- [x] inbound message effects
- [x] outbound message effects
- [x] outbound message effects
- [ ] inbound markdown
- [ ] outbound markdown
- [x] stream bubbles
- [ ] turn policy set to steer
- [ ] trunate inbound replies in context IF it's not in the memory of the current session
- [ ] explain <context> in instructions