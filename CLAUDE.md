# Claude Code Instructions for Workout Circle App

## Technology Stack
- **Framework**: Next.js 16.x (App Router)
- **Database**: Neon PostgreSQL with Drizzle ORM
- **AI**: OpenAI GPT-5.2 via Vercel AI SDK
- **UI**: shadcn/ui with Tailwind CSS
- **Auth**: NextAuth.js with circle passkey authentication

## Important: Always Use Latest Documentation

When working with this codebase, always reference the **latest documentation** for:

1. **Next.js** - Use the latest App Router patterns and APIs
   - Check for new features in Next.js 16+
   - Use modern server/client component patterns

2. **Vercel AI SDK** - Use the latest @ai-sdk/openai and @ai-sdk/react
   - API changes frequently - verify hook signatures (useChat, useCompletion)
   - Use correct response methods (toTextStreamResponse, etc.)

3. **OpenAI API** - Use the latest models
   - Currently using GPT-5.2 for superior reasoning
   - Check for new model releases and capabilities

4. **Neon/Drizzle** - Use latest Drizzle ORM patterns
   - Check for new query syntax and relation patterns
   - Use latest migration features

5. **shadcn/ui** - Use latest component patterns
   - Check for component API changes
   - Use new components as they're released

## Code Patterns

### Database Queries
Use Drizzle query builder with relations:
```typescript
const member = await db.query.circleMembers.findFirst({
  where: eq(circleMembers.id, id),
  with: {
    metrics: true,
    goals: true,
  },
});
```

### AI Responses
Use streamText with toTextStreamResponse for chat:
```typescript
const result = streamText({
  model: openai("gpt-5.2"),
  system: systemPrompt,
  messages,
});
return result.toTextStreamResponse();
```

### Client Components with AI
Use manual state management for input in useChat:
```typescript
const [inputValue, setInputValue] = useState("");
const { messages, append, status } = useChat({ api: "/api/ai/chat" });
```

## Terminology
- "Circle" = group of users (renamed from "Family")
- "Member" = person in a circle
- "Goals" = fitness targets with progress tracking
- "Limitations" = injuries/conditions to consider in workouts
