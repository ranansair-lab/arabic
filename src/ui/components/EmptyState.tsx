import { useNavigate } from 'react-router-dom';
import { instruction } from '../../curriculum/content';

/** Friendly message when the mastered-letter rule leaves nothing to show. */
export function EmptyState({ messageId = 'learn_more', emoji = '🌟', detail }: { messageId?: string; emoji?: string; detail?: string }) {
  const navigate = useNavigate();
  return (
    <div className="card center empty" data-testid="empty-state">
      <div className="big" aria-hidden>{emoji}</div>
      <p className="title" lang="ar">{instruction(messageId).text} 🌟</p>
      {detail && <p className="parent" style={{ textAlign: 'center', color: 'var(--ink-soft)' }}>{detail}</p>}
      <button className="btn" onClick={() => navigate('/')} data-testid="empty-go-home">
        <span aria-hidden>🔤</span>
        <span lang="ar">{instruction('choose_letter').text}</span>
      </button>
    </div>
  );
}
