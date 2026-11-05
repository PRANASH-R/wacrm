import { describe, expect, it } from 'vitest';
import { renderConversationSummaryEmail } from './summary-report';
import type { ConversationSummaryData } from '../types';

describe('renderConversationSummaryEmail', () => {
  const mockData: ConversationSummaryData = {
    customerName: 'Sarah Jenkins',
    customerPhone: '+1 555-019-2834',
    customerEmail: 'sarah@example.com',
    conversationId: 'conv-123',
    messageCount: 8,
    overview: 'Customer inquired about 50 custom ceramic coffee mugs.',
    requirements: ['50 custom mugs', 'Vector logo printed on both sides'],
    questions: ['Do you offer bulk discounts?', 'Is shipping included?'],
    preferences: ['Matte black finish', 'Under $12 per unit'],
    decisions: ['Agreed to matte finish', 'Provided email for invoice'],
    finalOutcome: 'Quotation Requested',
    recommendedNextAction: 'Send formal quote to sarah@example.com',
    sentiment: 'positive',
    triggerReason: 'completed',
    chatUrl: 'https://crm.example.com/inbox?c=conv-123',
    accountName: 'Acme Ceramics',
  };

  it('renders executive summary with all key sections', () => {
    const { subject, html, text } = renderConversationSummaryEmail(mockData);

    expect(subject).toContain('Sarah Jenkins');
    expect(subject).toContain('Quotation Requested');

    expect(html).toContain('Customer Conversation Summary');
    expect(html).toContain('Sarah Jenkins');
    expect(html).toContain('+1 555-019-2834');
    expect(html).toContain('Customer Requirements');
    expect(html).toContain('50 custom mugs');
    expect(html).toContain('Key Questions Asked');
    expect(html).toContain('Preferences &amp; Constraints');
    expect(html).toContain('Decisions Made');
    expect(html).toContain('Final Outcome');
    expect(html).toContain('Recommended Action');
    expect(html).toContain('https://crm.example.com/inbox?c=conv-123');

    expect(text).toContain('EXECUTIVE OVERVIEW:');
    expect(text).toContain('CUSTOMER REQUIREMENTS:');
    expect(text).toContain('50 custom mugs');
  });

  it('handles empty lists gracefully without throwing', () => {
    const minimalData: ConversationSummaryData = {
      ...mockData,
      requirements: [],
      questions: [],
      preferences: [],
      decisions: [],
      sentiment: 'neutral',
      triggerReason: 'closed',
    };

    const { html, text } = renderConversationSummaryEmail(minimalData);
    expect(html).toContain('None recorded');
    expect(text).toContain('None');
  });
});
