type FeedbackInput = {
  walletAddress?: string;
  message?: string;
  rating?: number;
};

const feedback: Array<FeedbackInput & { id: string; createdAt: string }> = [];

export const feedbackService = {
  async saveFeedback(input: FeedbackInput) {
    if (!input.message || input.message.trim().length < 3) {
      throw new Error("Feedback message is required");
    }

    const saved = {
      id: crypto.randomUUID(),
      walletAddress: input.walletAddress,
      message: input.message.trim(),
      rating: input.rating,
      createdAt: new Date().toISOString()
    };

    feedback.push(saved);
    return saved;
  }
};
