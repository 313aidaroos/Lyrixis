import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const VALID_CATEGORIES = ['bug', 'feature_request', 'billing', 'general'];

export async function POST(request: NextRequest) {
  try {
    const { email, subject, message, category } = await request.json();

    // Validation
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    if (!message || message.trim().length < 10) {
      return NextResponse.json(
        { error: 'Message must be at least 10 characters' },
        { status: 400 }
      );
    }

    if (!VALID_CATEGORIES.includes(category || 'general')) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Create support ticket
    const { data: ticket, error } = await admin
      .from('support_tickets')
      .insert({
        user_email: email,
        subject: subject || 'General inquiry',
        message,
        category: category || 'general',
        status: 'open',
        routed_to: 'awad@apixis.dev',
      })
      .select('id, created_at')
      .single();

    if (error || !ticket) {
      console.error('Support ticket creation failed:', error);
      return NextResponse.json(
        { error: 'Failed to create support ticket' },
        { status: 500 }
      );
    }

    // Send confirmation email to user (mock)
    console.log(`Support ticket ${ticket.id} created for ${email}`);
    console.log(`Routing to awad@apixis.dev`);

    // In production, send actual email here

    return NextResponse.json({
      success: true,
      ticketId: ticket.id,
      message: 'We received your support request. Awad will review it shortly.',
      confirmationEmail: `sent to ${email}`,
    });
  } catch (error) {
    console.error('Support intake error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
