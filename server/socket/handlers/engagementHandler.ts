import { Socket, Server } from 'socket.io';
import { userRepository } from '../../repositories/userRepository.js';
import type {
  RaiseHandPayload,
  ReactionPayload,
  CreatePollPayload,
  VotePollPayload,
  SubmitQuestionPayload,
  UpvoteQuestionPayload,
  AnswerQuestionPayload,
  Poll,
  QAQuestion,
} from '@shared/types';

// ── In-memory stores ──────────────────────────────────────────────────────────
/** roomId → Poll[] */
const polls = new Map<string, Poll[]>();
/** roomId → QAQuestion[] */
const questions = new Map<string, QAQuestion[]>();

function getPollsForRoom(roomId: string): Poll[] {
  if (!polls.has(roomId)) polls.set(roomId, []);
  return polls.get(roomId)!;
}

function getQuestionsForRoom(roomId: string): QAQuestion[] {
  if (!questions.has(roomId)) questions.set(roomId, []);
  return questions.get(roomId)!;
}

function randomId(): string {
  return Math.random().toString(36).substring(2, 11);
}

/**
 * Handles engagement events: raise-hand, reactions, polls, and Q&A.
 */
export function registerEngagementHandlers(socket: Socket, io: Server): void {
  // ── Raise Hand ─────────────────────────────────────────────────────────────
  socket.on('raise-hand', ({ raised }: { raised: boolean }) => {
    const user = userRepository.get(socket.id);
    if (!user?.roomId) return;

    const payload: RaiseHandPayload = {
      userId: socket.id,
      userName: user.name,
      raised,
    };
    io.to(user.roomId).emit('hand-raised', payload);
  });

  // ── Emoji Reaction ─────────────────────────────────────────────────────────
  socket.on('send-reaction', ({ emoji }: { emoji: string }) => {
    const user = userRepository.get(socket.id);
    if (!user?.roomId) return;

    // Whitelist a safe set of emoji to prevent arbitrary strings
    const ALLOWED_EMOJI = ['👍', '👏', '❤️', '😂', '😮', '🎉', '🔥', '🙌', '👀', '💯'];
    if (!ALLOWED_EMOJI.includes(emoji)) return;

    const payload: ReactionPayload = {
      userId: socket.id,
      userName: user.name,
      emoji,
    };
    io.to(user.roomId).emit('reaction-received', payload);
  });

  // ── Polls ──────────────────────────────────────────────────────────────────
  socket.on('create-poll', ({ roomId, question, options }: CreatePollPayload) => {
    const user = userRepository.get(socket.id);
    if (!user?.roomId || user.roomId !== roomId) return;
    if (!question?.trim() || !options?.length || options.length < 2) return;
    if (options.length > 6) return; // cap options

    const poll: Poll = {
      id: randomId(),
      roomId,
      createdBy: socket.id,
      question: question.trim().slice(0, 200),
      options: options
        .slice(0, 6)
        .map(text => ({ id: randomId(), text: text.trim().slice(0, 100), votes: [] })),
      closed: false,
      createdAt: new Date().toISOString(),
    };

    getPollsForRoom(roomId).push(poll);
    io.to(roomId).emit('poll-created', poll);
    console.log(`Poll created in room "${roomId}" by ${socket.id}`);
  });

  socket.on('vote-poll', ({ roomId, pollId, optionId }: VotePollPayload) => {
    const user = userRepository.get(socket.id);
    if (!user?.roomId || user.roomId !== roomId) return;

    const roomPolls = getPollsForRoom(roomId);
    const poll = roomPolls.find(p => p.id === pollId);
    if (!poll || poll.closed) return;

    // Remove any existing vote from this user (one vote per poll)
    poll.options.forEach(o => {
      o.votes = o.votes.filter(v => v !== socket.id);
    });

    const option = poll.options.find(o => o.id === optionId);
    if (!option) return;
    option.votes.push(socket.id);

    io.to(roomId).emit('poll-updated', poll);
  });

  socket.on('close-poll', ({ roomId, pollId }: { roomId: string; pollId: string }) => {
    const user = userRepository.get(socket.id);
    if (!user?.roomId || user.roomId !== roomId) return;

    const roomPolls = getPollsForRoom(roomId);
    const poll = roomPolls.find(p => p.id === pollId);
    if (!poll) return;

    poll.closed = true;
    io.to(roomId).emit('poll-updated', poll);
  });

  // ── Q&A ────────────────────────────────────────────────────────────────────
  socket.on('submit-question', ({ roomId, text, userName }: SubmitQuestionPayload) => {
    const user = userRepository.get(socket.id);
    if (!user?.roomId || user.roomId !== roomId) return;
    if (!text?.trim()) return;

    const question: QAQuestion = {
      id: randomId(),
      roomId,
      userId: socket.id,
      userName,
      text: text.trim().slice(0, 300),
      upvotes: [],
      answered: false,
      createdAt: new Date().toISOString(),
    };

    getQuestionsForRoom(roomId).push(question);
    io.to(roomId).emit('question-submitted', question);
  });

  socket.on('upvote-question', ({ roomId, questionId }: UpvoteQuestionPayload) => {
    const user = userRepository.get(socket.id);
    if (!user?.roomId || user.roomId !== roomId) return;

    const roomQuestions = getQuestionsForRoom(roomId);
    const question = roomQuestions.find(q => q.id === questionId);
    if (!question || question.answered) return;

    // Toggle upvote
    if (question.upvotes.includes(socket.id)) {
      question.upvotes = question.upvotes.filter(id => id !== socket.id);
    } else {
      question.upvotes.push(socket.id);
    }

    io.to(roomId).emit('question-updated', question);
  });

  socket.on('answer-question', ({ roomId, questionId }: AnswerQuestionPayload) => {
    const user = userRepository.get(socket.id);
    if (!user?.roomId || user.roomId !== roomId) return;

    const roomQuestions = getQuestionsForRoom(roomId);
    const question = roomQuestions.find(q => q.id === questionId);
    if (!question) return;

    question.answered = true;
    io.to(roomId).emit('question-updated', question);
  });

  // ── State sync: send existing polls and questions on join ──────────────────
  socket.on('request-engagement-state', ({ roomId }: { roomId: string }) => {
    const user = userRepository.get(socket.id);
    if (!user?.roomId || user.roomId !== roomId) return;

    socket.emit('engagement-state', {
      polls: getPollsForRoom(roomId),
      questions: getQuestionsForRoom(roomId),
    });
  });
}

/** Clean up room engagement data when a room is closed. */
export function clearEngagementData(roomId: string): void {
  polls.delete(roomId);
  questions.delete(roomId);
}
