class AIManager {
  static hasLoggedKeys = false; // Prevent repeated API key logging
  
  constructor() {
    // Feature flags - initialize first
    this.debugMode = import.meta.env.VITE_DEBUG_MODE === 'true';
    this.enableTranslation = import.meta.env.VITE_ENABLE_TRANSLATION !== 'false';
    
    // Environment variables with fallbacks
    this.baseURL = import.meta.env.VITE_HUGGINGFACE_BASE_URL || 'https://api-inference.huggingface.co/models';
    this.model = 'microsoft/DialoGPT-medium';
    this.textModel = 'facebook/blenderbot-400M-distill';
    
    // API Keys - prioritize environment variables
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
    this.openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY || '';
    this.togetherKey = import.meta.env.VITE_TOGETHER_API_KEY || '';
    this.huggingFaceToken = import.meta.env.VITE_HUGGINGFACE_API_TOKEN || '';
    
    // Log API key availability for debugging (only once)
    if (this.debugMode && !AIManager.hasLoggedKeys) {
      console.log('🔑 [DEBUG] API Keys loaded from environment:');
      console.log('- OpenAI:', this.apiKey ? `✅ Available (${this.apiKey.length} chars)` : '❌ Not configured');
      console.log('- OpenRouter:', this.openRouterKey ? `✅ Available (${this.openRouterKey.length} chars)` : '❌ Not configured');
      console.log('- Together AI:', this.togetherKey ? `✅ Available (${this.togetherKey.length} chars)` : '❌ Not configured');
      AIManager.hasLoggedKeys = true;
    }
    
    // API Base URLs from environment
    this.openaiBaseURL = import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1';
    this.openRouterBaseURL = import.meta.env.VITE_OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    this.togetherBaseURL = import.meta.env.VITE_TOGETHER_BASE_URL || 'https://api.together.xyz/v1';
  }

  // Debug logging utility
  debugLog(message, ...args) {
    if (this.debugMode) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  // Info logging (always shown)
  infoLog(message, ...args) {
    console.log(`ℹ️ ${message}`, ...args);
  }

  async initializeAPI() {
    // Refresh API keys from environment (in case they changed)
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
    this.openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY || '';
    this.togetherKey = import.meta.env.VITE_TOGETHER_API_KEY || '';
    
    // Only log initialization info once per session
    if (this.debugMode && !AIManager.hasLoggedKeys) {
      const hasOpenAI = Boolean(this.apiKey);
      const hasOpenRouter = Boolean(this.openRouterKey);
      const hasTogether = Boolean(this.togetherKey);
      
      this.debugLog('🚀 AI Manager initialized with environment variables:');
      this.debugLog('- OpenAI API:', hasOpenAI ? '✅ Configured' : '❌ Not configured');
      this.debugLog('- OpenRouter API:', hasOpenRouter ? '✅ Configured' : '❌ Not configured');
      this.debugLog('- Together AI API:', hasTogether ? '✅ Configured' : '❌ Not configured');
      this.debugLog('- Free fallback APIs: ✅ Available');
      
      if (!hasOpenAI && !hasOpenRouter && !hasTogether) {
        this.infoLog('Using free translation services (no premium API keys configured)');
      }
    }
    
    return true;
  }

  // OpenAI API call method
  async callOpenAI(messages, options = {}) {
    if (!this.apiKey) {
      console.error('❌ OpenAI API key not configured');
      throw new Error('OpenAI API key not configured');
    }

    this.debugLog('🔗 Making OpenAI API call...');
    this.debugLog('🔑 API Key prefix:', this.apiKey.substring(0, 20) + '...');
    this.debugLog('🌐 API URL:', `${this.openaiBaseURL}/chat/completions`);
    this.debugLog('🎛️ Model:', options.model || 'gpt-3.5-turbo');

    const requestBody = {
      model: options.model || 'gpt-3.5-turbo',
      messages: messages,
      max_tokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.7,
      ...options
    };

    console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${this.openaiBaseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ OpenAI API error data:', errorData);
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log('📨 Response data:', data);
    console.log('💬 Generated content:', data.choices[0]?.message?.content?.substring(0, 100) || 'No content');
    return data.choices[0]?.message?.content || '';
  }

  async makeRequest(text, task = 'text-generation') {
    const modelMap = {
      'text-generation': 'gpt2',
      'summarization': 'facebook/bart-large-cnn',
      'text-classification': 'cardiffnlp/twitter-roberta-base-sentiment-latest',
      'translation': 'Helsinki-NLP/opus-mt-en-es'
    };

    const model = modelMap[task] || 'gpt2';
    
    try {
      const response = await fetch(`${this.baseURL}/${model}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: text,
          parameters: {
            max_length: task === 'summarization' ? 100 : 200,
            temperature: 0.7,
            do_sample: true
          }
        })
      });

      if (!response.ok) {
        // Fallback to local processing if API fails
        return this.fallbackProcessing(text, task);
      }

      const data = await response.json();
      
      if (Array.isArray(data) && data[0]) {
        return data[0].generated_text || data[0].summary_text || data[0].translation_text || text;
      }
      
      return this.fallbackProcessing(text, task);
    } catch (error) {
      console.warn('AI API unavailable, using fallback:', error);
      return this.fallbackProcessing(text, task);
    }
  }

  fallbackProcessing(text, task) {
    switch (task) {
      case 'summarization':
        return this.simpleSummarize(text);
      case 'tags':
        return this.simpleTagGeneration(text);
      case 'grammar':
        return this.simpleGrammarCheck(text);
      case 'translation':
        return `Translation: ${text}`;
      default:
        return text;
    }
  }

  simpleSummarize(text) {
    const trimmedText = text.trim();
    console.log('📝 Simple summarize input:', trimmedText.substring(0, 100));
    
    // For very short text, extract key points
    if (trimmedText.length < 50) {
      return `📝 Summary: ${trimmedText}`;
    }
    
    // Better sentence splitting that handles run-on sentences
    const sentences = trimmedText.split(/(?<=[.!?])\s+|(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\!|\?)\s+/g)
      .filter(s => s.trim().length > 10);
    
    console.log('📝 Sentences found:', sentences.length);
    console.log('📝 First sentence:', sentences[0]?.substring(0, 50));
    
    // If it's all one long sentence without proper punctuation, break it intelligently
    if (sentences.length <= 1) {
      const longText = sentences[0] || trimmedText;
      
      // Look for natural break points (conjunctions, commas)
      const breakPoints = longText.split(/\s+(?:and|but|so|after|then|however|also)\s+/i);
      
      if (breakPoints.length > 1) {
        console.log('📝 Breaking long sentence at conjunctions:', breakPoints.length, 'parts');
        const keyParts = [];
        
        // Take first part (the main action)
        keyParts.push(breakPoints[0].trim());
        
        // Find the most informative middle part
        if (breakPoints.length > 2) {
          const middlePart = breakPoints[Math.floor(breakPoints.length / 2)].trim();
          if (middlePart.length > 20) {
            keyParts.push(middlePart);
          }
        }
        
        // Take last part if it's substantial
        const lastPart = breakPoints[breakPoints.length - 1].trim();
        if (lastPart.length > 20 && lastPart !== keyParts[0]) {
          keyParts.push(lastPart);
        }
        
        // Extract key terms from the full text
        const keyWords = trimmedText.match(/\b\w{4,}\b/g) || [];
        const uniqueKeyWords = [...new Set(keyWords
          .filter(word => !['that', 'with', 'there', 'they', 'some', 'very', 'after', 'going'].includes(word.toLowerCase()))
          .slice(0, 6))];
        
        const summary = keyParts.join(', then ');
        console.log('📝 Generated summary from parts:', summary.substring(0, 100));
        
        return `📝 Summary: ${summary}.\n\n🔑 Key activities: ${uniqueKeyWords.join(', ')}`;
      } else {
        // Single sentence - just trim it intelligently
        const keyWords = trimmedText.match(/\b\w{4,}\b/g) || [];
        const uniqueKeyWords = [...new Set(keyWords.slice(0, 5))];
        const summary = trimmedText.substring(0, 200);
        return `📝 Summary: ${summary}${trimmedText.length > 200 ? '...' : ''}\n\n🔑 Key terms: ${uniqueKeyWords.join(', ')}`;
      }
    }
    
    // Multiple sentences - use enhanced logic  
    if (sentences.length === 2) {
      const keyWords = trimmedText.match(/\b\w{4,}\b/g) || [];
      const uniqueKeyWords = [...new Set(keyWords.slice(0, 4))];
      return `📝 Summary: ${sentences[0].trim()}. ${sentences[1].trim()}.\n\n🔑 Key terms: ${uniqueKeyWords.join(', ')}`;
    }
    
    // Multiple sentences - extract most important ones
    const firstSentence = sentences[0]?.trim() || '';
    const lastSentence = sentences[sentences.length - 1]?.trim() || '';
    const longestSentence = sentences.length > 2 ? sentences.reduce((longest, current) => 
      current.length > longest.length ? current : longest
    ).trim() : '';
    
    const summaryParts = [];
    
    // Always include first sentence
    if (firstSentence) {
      summaryParts.push(firstSentence);
    }
    
    // Add longest sentence if it's meaningfully different and informative
    if (longestSentence && longestSentence !== firstSentence && 
        longestSentence.length > firstSentence.length * 0.6 && longestSentence.length > 30) {
      summaryParts.push(longestSentence);
    }
    
    // Add last sentence if it provides closure and is different
    if (lastSentence && lastSentence !== firstSentence && lastSentence !== longestSentence && 
        sentences.length > 2 && lastSentence.length > 25) {
      summaryParts.push(lastSentence);
    }
    
    // If we only have one part and there are more sentences, add a middle one
    if (summaryParts.length === 1 && sentences.length > 3) {
      const middleIndex = Math.floor(sentences.length / 2);
      const middleSentence = sentences[middleIndex]?.trim();
      if (middleSentence && middleSentence.length > 20 && middleSentence !== firstSentence) {
        summaryParts.push(middleSentence);
      }
    }
    
    // Extract key terms for additional context
    const allText = summaryParts.join(' ');
    const keyWords = allText.match(/\b\w{4,}\b/g) || [];
    const uniqueKeyWords = [...new Set(keyWords
      .filter(word => !['that', 'with', 'there', 'they', 'some', 'very', 'after'].includes(word.toLowerCase()))
      .slice(0, 5))];
    
    const finalSummary = summaryParts.join('. ') + '.';
    console.log('📝 Final summary generated:', finalSummary.substring(0, 100));
    
    return `📝 Summary: ${finalSummary}\n\n🔑 Key terms: ${uniqueKeyWords.join(', ')}`;
  }

  simpleTagGeneration(text) {
    const commonWords = new Set([
      'this', 'that', 'with', 'have', 'will', 'been', 'from', 'they', 'know', 'want', 
      'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here', 'just', 'like', 
      'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'were',
      'what', 'would', 'there', 'could', 'other', 'after', 'first', 'also', 'back',
      'through', 'work', 'life', 'only', 'think', 'into', 'year', 'should', 'people',
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'does', 'each', 'few', 'got', 'let', 'man', 'off', 'own', 'put', 'say', 'she', 'too', 'use'
    ]);
    
    console.log('🏷️ Tag generation analyzing text:', text);
    
    // For very short text, extract all meaningful words
    const allWords = text.toLowerCase().match(/\b\w{3,}\b/g) || [];
    console.log('🏷️ Found words:', allWords);
    
    const wordCount = {};
    
    // Extract meaningful words (3+ characters for shorter text, not common words)
    allWords.forEach(word => {
      if (!commonWords.has(word) && word.length >= 3) {
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });
    
    // Also look for capitalized words (potential proper nouns/topics)
    const capitalizedWords = text.match(/\b[A-Z][a-z]{2,}\b/g) || [];
    capitalizedWords.forEach(word => {
      const lowerWord = word.toLowerCase();
      if (!commonWords.has(lowerWord)) {
        wordCount[lowerWord] = (wordCount[lowerWord] || 0) + 2; // Give more weight to capitalized words
      }
    });
    
    // Look for quoted phrases that might be important
    const quotedPhrases = text.match(/"([^"]+)"/g) || [];
    quotedPhrases.forEach(phrase => {
      const cleanPhrase = phrase.replace(/"/g, '').toLowerCase();
      const words = cleanPhrase.split(/\s+/).filter(w => w.length > 3 && !commonWords.has(w));
      words.forEach(word => {
        wordCount[word] = (wordCount[word] || 0) + 1.5;
      });
    });
    
    // Look for technical terms or domain-specific words
    const technicalPattern = /\b\w*(?:tion|sion|ment|ness|ity|ing|ed|er|ly|al|ic)\b/gi;
    const technicalWords = text.match(technicalPattern) || [];
    technicalWords.forEach(word => {
      const lowerWord = word.toLowerCase();
      if (lowerWord.length > 4 && !commonWords.has(lowerWord)) {
        wordCount[lowerWord] = (wordCount[lowerWord] || 0) + 1.5;
      }
    });
    
    const tags = Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8)
      .map(([word]) => word);
    
    // Add context-based tags for common themes
    const contextTags = [];
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('function') || lowerText.includes('code') || lowerText.includes('programming') || lowerText.includes('javascript') || lowerText.includes('html')) {
      contextTags.push('programming');
    }
    if (lowerText.includes('meeting') || lowerText.includes('agenda') || lowerText.includes('discussion')) {
      contextTags.push('meeting');
    }
    if (lowerText.includes('idea') || lowerText.includes('plan') || lowerText.includes('strategy')) {
      contextTags.push('planning');
    }
    if (lowerText.includes('todo') || lowerText.includes('task') || lowerText.includes('deadline')) {
      contextTags.push('todo');
    }
    if (lowerText.includes('note') || lowerText.includes('remember') || lowerText.includes('important')) {
      contextTags.push('notes');
    }
    if (lowerText.includes('error') || lowerText.includes('problem') || lowerText.includes('issue') || lowerText.includes('bug')) {
      contextTags.push('troubleshooting');
    }
    if (lowerText.includes('learn') || lowerText.includes('study') || lowerText.includes('tutorial')) {
      contextTags.push('learning');
    }
    
    // Combine and limit tags
    const allTags = [...new Set([...tags, ...contextTags])];
    
    // If we still don't have enough tags, add some based on text characteristics
    if (allTags.length < 3) {
      if (text.length < 20) allTags.push('short');
      if (text.includes('?')) allTags.push('question');
      if (text.includes('!')) allTags.push('important');
      if (/[A-Z]/.test(text)) allTags.push('formal');
      if (text.length > 100) allTags.push('detailed');
    }
    
    const finalTags = allTags.slice(0, 5);
    console.log('🏷️ Generated tags:', finalTags);
    
    return finalTags;
  }

  simpleGrammarCheck(text) {
    const issues = [];
    const originalText = text;
    
    console.log('🔍 Grammar check analyzing text:', text);
    
    // Check for common spelling errors and typos
    const commonErrors = [
      { wrong: /\brecieve\b/gi, correct: 'receive', explanation: 'Common spelling error: "i before e except after c"' },
      { wrong: /\bteh\b/gi, correct: 'the', explanation: 'Typo: "teh" should be "the"' },
      { wrong: /\bwont\b/gi, correct: 'won\'t', explanation: 'Missing apostrophe: "won\'t"' },
      { wrong: /\bcant\b/gi, correct: 'can\'t', explanation: 'Missing apostrophe: "can\'t"' },
      { wrong: /\bdont\b/gi, correct: 'don\'t', explanation: 'Missing apostrophe: "don\'t"' },
      { wrong: /\bisnt\b/gi, correct: 'isn\'t', explanation: 'Missing apostrophe: "isn\'t"' },
      { wrong: /\bwasnt\b/gi, correct: 'wasn\'t', explanation: 'Missing apostrophe: "wasn\'t"' },
      { wrong: /\bhavent\b/gi, correct: 'haven\'t', explanation: 'Missing apostrophe: "haven\'t"' },
      { wrong: /\bgrammers\b/gi, correct: 'grammar', explanation: 'Spelling error: "grammers" should be "grammar"' },
      { wrong: /\bseen\b(?=.*\byesterday\b)/gi, correct: 'saw', explanation: 'Use "saw" for past tense with time references like "yesterday"' },
      { wrong: /\bvegitables\b/gi, correct: 'vegetables', explanation: 'Spelling error: "vegitables" should be "vegetables"' },
      { wrong: /\bsandwichs\b/gi, correct: 'sandwiches', explanation: 'Plural spelling: "sandwichs" should be "sandwiches"' },
      { wrong: /\btommorow\b/gi, correct: 'tomorrow', explanation: 'Spelling error: "tommorow" should be "tomorrow"' },
      { wrong: /\bfruit\'s\b/gi, correct: 'fruits', explanation: 'Remove apostrophe: "fruit\'s" should be "fruits" for plural' },
      { wrong: /\bplan\'s\b/gi, correct: 'plans', explanation: 'Remove apostrophe: "plan\'s" should be "plans" for plural' },
      { wrong: /\berror\s+error\b/gi, correct: 'error', explanation: 'Repeated word: remove duplicate "error"' },
      { wrong: /\bcontains\s+contains\b/gi, correct: 'contains', explanation: 'Repeated word: remove duplicate "contains"' },
      { wrong: /\bhe\s+dont\s+had\b/gi, correct: 'he didn\'t have', explanation: 'Grammar error: "he dont had" should be "he didn\'t have"' },
      { wrong: /\bwe\s+goes\b/gi, correct: 'we go', explanation: 'Subject-verb agreement: "we goes" should be "we go"' },
      { wrong: /\bborrow\s+him\b/gi, correct: 'lent him', explanation: 'Word choice: "borrow him" should be "lent him" or "loaned him"' }
    ];
    
    // Check for spelling/grammar errors
    commonErrors.forEach(({ wrong, correct, explanation }) => {
      const matches = text.match(wrong);
      if (matches) {
        matches.forEach(match => {
          issues.push({
            error: `"${match}"`,
            correction: correct,
            explanation: explanation
          });
        });
      }
    });
    
    // Split into sentences for analysis
    const sentences = text.split(/[.!?]+/);
    
    sentences.forEach((sentence, index) => {
      const trimmed = sentence.trim();
      if (trimmed.length > 0) {
        // Check for capitalization
        if (!/^[A-Z]/.test(trimmed) && trimmed.length > 2) {
          issues.push({
            error: `"${trimmed.substring(0, 20)}..."`,
            correction: `"${trimmed.charAt(0).toUpperCase() + trimmed.slice(1)}..."`,
            explanation: "Sentence should start with a capital letter"
          });
        }
        
        // Check for repeated words within sentence
        const words = trimmed.toLowerCase().split(/\s+/);
        for (let i = 0; i < words.length - 1; i++) {
          if (words[i] === words[i + 1] && words[i].length > 2) {
            issues.push({
              error: `Repeated word: "${words[i]} ${words[i]}"`,
              correction: `"${words[i]}"`,
              explanation: "Remove repeated words"
            });
          }
        }
        
        // Check for subject-verb agreement issues
        if (/\b(he|she|it)\s+(are|have)\b/gi.test(trimmed)) {
          issues.push({
            error: "Subject-verb disagreement",
            correction: 'Use "is/has" with he/she/it',
            explanation: "Singular subjects need singular verbs"
          });
        }
        
        // Check for run-on sentences (basic check)
        if (trimmed.length > 150 && !trimmed.includes(',') && !trimmed.includes(';')) {
          issues.push({
            error: "Possible run-on sentence",
            correction: "Consider adding punctuation or breaking into shorter sentences",
            explanation: "Long sentences may need punctuation for clarity"
          });
        }
      }
    });
    
    // Check for double spaces
    if (text.includes('  ')) {
      issues.push({
        error: "Multiple spaces found",
        correction: "Use single spaces",
        explanation: "Remove extra spaces between words"
      });
    }
    
    // Check for missing periods at end
    if (text.length > 10 && !/[.!?]\s*$/.test(text.trim())) {
      issues.push({
        error: "Missing end punctuation",
        correction: "Add period, exclamation, or question mark",
        explanation: "Text should end with proper punctuation"
      });
    }
    
    // Check for inconsistent capitalization
    const words = text.split(/\s+/);
    const capitalizedWords = words.filter(word => /^[A-Z][a-z]/.test(word));
    if (capitalizedWords.length > 0 && words.length > 5) {
      // Look for inconsistent proper noun capitalization
      const wordCounts = {};
      words.forEach(word => {
        const lower = word.toLowerCase();
        if (lower.length > 3) {
          wordCounts[lower] = (wordCounts[lower] || 0) + 1;
        }
      });
    }
    
    console.log('🔍 Grammar check found', issues.length, 'issues:', issues);
    
    return issues.slice(0, 10); // Limit to 10 issues
  }

  async summarizeText(text) {
    if (!text || text.trim().length < 10) {
      throw new Error('Text too short to summarize - please add at least 10 characters');
    }

    console.log('📝 Starting text summarization...');
    console.log('📄 Text length:', text.length);

    try {
      // Try premium APIs first
      if (this.apiKey) {
        console.log('🚀 Attempting OpenAI summarization...');
        try {
          const summary = await this.summarizeWithOpenAI(text);
          if (summary) {
            console.log('✅ OpenAI summarization successful');
            return summary;
          }
        } catch (error) {
          console.warn('⚠️ OpenAI summarization failed:', error.message);
        }
      }

      // Fallback to simple summarization
      console.log('🔄 Using simple summarization fallback...');
      const result = this.simpleSummarize(text);
      console.log('✅ Simple summarization completed');
      return result;
    } catch (error) {
      console.error('❌ All summarization methods failed:', error);
      return this.simpleSummarize(text);
    }
  }

  async generateTags(text) {
    if (!text || text.trim().length < 5) {
      throw new Error('Text too short to generate tags - please add at least 5 characters');
    }

    console.log('🏷️ Starting tag generation...');
    console.log('📄 Text length:', text.length);

    try {
      // Try premium APIs first
      if (this.apiKey) {
        console.log('🚀 Attempting OpenAI tag generation...');
        try {
          const tags = await this.generateTagsWithOpenAI(text);
          if (tags && tags.length > 0) {
            console.log('✅ OpenAI tag generation successful:', tags);
            return tags;
          }
        } catch (error) {
          console.warn('⚠️ OpenAI tag generation failed:', error.message);
        }
      }

      // Fallback to simple tag generation
      console.log('🔄 Using simple tag generation fallback...');
      const result = this.simpleTagGeneration(text);
      console.log('✅ Simple tag generation completed:', result);
      return result;
    } catch (error) {
      console.error('❌ All tag generation methods failed:', error);
      return this.simpleTagGeneration(text);
    }
  }

  async checkGrammar(text) {
    if (!text || text.trim().length < 10) {
      return [];
    }

    console.log('📝 Starting grammar check...');
    console.log('📄 Text length:', text.length);

    try {
      // Try premium APIs first
      if (this.apiKey) {
        console.log('🚀 Attempting OpenAI grammar check...');
        try {
          const errors = await this.checkGrammarWithOpenAI(text);
          if (errors && errors.length >= 0) {
            console.log('✅ OpenAI grammar check successful:', errors.length, 'issues found');
            return errors;
          }
        } catch (error) {
          console.warn('⚠️ OpenAI grammar check failed:', error.message);
        }
      }

      // Fallback to simple grammar check
      console.log('🔄 Using simple grammar check fallback...');
      const result = this.simpleGrammarCheck(text);
      console.log('✅ Simple grammar check completed:', result.length, 'issues found');
      return result;
    } catch (error) {
      console.error('❌ All grammar check methods failed:', error);
      return [];
    }
  }

  async translateText(text, targetLanguage) {
    if (!text || text.trim().length < 5) {
      throw new Error('Text too short to translate');
    }

    const languageNames = {
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'bn': 'Bengali',
      'ur': 'Urdu',
      'th': 'Thai',
      'vi': 'Vietnamese',
      'nl': 'Dutch',
      'sv': 'Swedish',
      'da': 'Danish',
      'no': 'Norwegian',
      'fi': 'Finnish'
    };

    const languageName = languageNames[targetLanguage] || targetLanguage;
    
    // Debug logging for translation
    this.infoLog('🌐 Starting translation to', languageName);
    this.debugLog('Text:', text.substring(0, 100));
    this.debugLog('Target language:', languageName);
    this.debugLog('API Key available:', !!this.apiKey);
    this.debugLog('API Key length:', this.apiKey?.length || 0);

    try {
      // 1. Try OpenAI API first (if API key is available)
      if (this.apiKey) {
        this.debugLog('🚀 Attempting OpenAI translation...');
        try {
          const translation = await this.translateWithOpenAI(text, languageName);
          if (translation) {
            this.infoLog('✅ Translation completed via OpenAI');
            this.debugLog('Translation result:', translation.substring(0, 50));
            return translation;
          }
        } catch (openaiError) {
          this.infoLog('⚠️ OpenAI API failed, trying free alternatives');
          this.debugLog('OpenAI error:', openaiError.message);
          // Continue to free APIs on OpenAI failure
        }
      } else {
        this.infoLog('Using free translation APIs');
      }

      // 2. Try free translation APIs as fallback
      this.debugLog('🔄 Trying free translation APIs...');
      try {
        const translation = await this.tryFreeTranslationAPIs(text, targetLanguage, languageName);
        this.infoLog('✅ Translation completed via free APIs');
        this.debugLog('Free API result:', translation.substring(0, 50));
        return translation;
      } catch (freeApiError) {
        this.infoLog('⚠️ Free APIs failed, using simple fallback');
        this.debugLog('Free API error:', freeApiError.message);
        // Continue to simple fallback
      }

      // 3. Use simple fallback translation
      this.debugLog('🔄 Using simple fallback translation...');
      const fallbackTranslation = this.simpleTranslationFallback(text, languageName);
      this.infoLog('✅ Translation completed via fallback');
      this.debugLog('Fallback result:', fallbackTranslation.substring(0, 50));
      return fallbackTranslation;

    } catch (error) {
      console.error('❌ Unexpected error in translation pipeline:', error);
      // Last resort fallback
      return `[${languageName}] ${text}`;
    }
  }

  // OpenAI translation method
  async translateWithOpenAI(text, targetLanguage) {
    try {
      this.debugLog('🔧 OpenAI API call - Target language:', targetLanguage);
      this.debugLog('🔧 OpenAI API call - Text length:', text.length);
      this.debugLog('🔧 OpenAI API call - Base URL:', this.openaiBaseURL);
      
      const messages = [
        {
          role: 'system',
          content: `You are a professional translator. Translate the given text to ${targetLanguage}. Preserve the original formatting, HTML tags, and structure. Only return the translated text, nothing else.`
        },
        {
          role: 'user',
          content: text
        }
      ];

      const translation = await this.callOpenAI(messages, {
        model: 'gpt-3.5-turbo',
        maxTokens: Math.min(2000, text.length * 2),
        temperature: 0.1 // Low temperature for consistent translations
      });

      console.log('🎉 OpenAI translation response received, length:', translation?.length || 0);
      return translation.trim();
    } catch (error) {
      console.error('❌ OpenAI translation failed:', error.message);
      console.error('❌ Full error:', error);
      throw error;
    }
  }

  async tryFreeTranslationAPIs(text, targetLang, languageName) {
    this.debugLog('🆓 Trying free translation services...');
    
    // First try MyMemory API (completely free, no auth required)
    try {
      this.debugLog('🌐 Trying MyMemory API...');
      const translation = await this.useMyMemoryAPI(text, targetLang, languageName);
      if (translation && translation !== text) {
        this.debugLog('✅ MyMemory API successful:', translation.substring(0, 50));
        return translation;
      }
    } catch (error) {
      this.debugLog('⚠️ MyMemory API failed:', error.message);
    }

    // Try LibreTranslate API (another free option)
    try {
      this.debugLog('🌐 Trying LibreTranslate API...');
      const translation = await this.useLibreTranslateAPI(text, targetLang, languageName);
      if (translation && translation !== text) {
        this.debugLog('✅ LibreTranslate API successful:', translation.substring(0, 50));
        return translation;
      }
    } catch (error) {
      this.debugLog('⚠️ LibreTranslate API failed:', error.message);
    }

    // If all free APIs fail, throw error to trigger simple fallback
    throw new Error('All free translation APIs failed');
  }

  async useMyMemoryAPI(text, targetLang, languageName) {
    try {
      const encodedText = encodeURIComponent(text.substring(0, 500)); // Limit text length
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=en|${targetLang}`,
        {
          method: 'GET',
          headers: {
            'User-Agent': 'ReactNotesApp/1.0'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        this.debugLog('🌐 MyMemory API response:', data);
        if (data.responseData && data.responseData.translatedText) {
          const translated = data.responseData.translatedText.trim();
          this.debugLog('📝 MyMemory translation result:', translated);
          // Check if translation is valid (not just returning original text)
          if (translated.toLowerCase() !== text.toLowerCase() && translated.length > 0) {
            this.debugLog('✅ MyMemory API returning valid translation:', translated);
            return translated;
          }
        }
      } else {
        this.debugLog('⚠️ MyMemory API response not OK:', response.status, response.statusText);
      }
    } catch (error) {
      console.warn('MyMemory API failed:', error);
      throw error;
    }

    throw new Error('MyMemory API did not return valid translation');
  }

  async useLibreTranslateAPI(text, targetLang, languageName) {
    try {
      // LibreTranslate uses different language codes
      const langMap = {
        'es': 'es', 'fr': 'fr', 'de': 'de', 'it': 'it', 'pt': 'pt',
        'ru': 'ru', 'ja': 'ja', 'zh': 'zh', 'ar': 'ar', 'hi': 'hi'
      };
      
      const targetCode = langMap[targetLang] || targetLang;
      
      const response = await fetch('https://libretranslate.de/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text.substring(0, 1000), // Limit text length
          source: 'en',
          target: targetCode,
          format: 'text'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.translatedText) {
          return data.translatedText;
        }
      }
    } catch (error) {
      console.warn('LibreTranslate API failed:', error);
      throw error;
    }

    throw new Error('LibreTranslate API did not return valid translation');
  }

  async summarizeWithOpenAI(text) {
    try {
      const messages = [
        {
          role: 'system',
          content: 'You are a professional text summarizer. Create a concise, informative summary of the given text. Focus on the main points and key information. Keep it under 200 words.'
        },
        {
          role: 'user',
          content: `Please summarize this text:\n\n${text}`
        }
      ];

      const summary = await this.callOpenAI(messages, {
        model: 'gpt-3.5-turbo',
        maxTokens: 250,
        temperature: 0.3
      });

      return summary.trim();
    } catch (error) {
      console.error('❌ OpenAI summarization failed:', error);
      throw error;
    }
  }

  async generateTagsWithOpenAI(text) {
    try {
      const messages = [
        {
          role: 'system',
          content: 'You are a content analyzer. Generate 3-5 relevant tags for the given text. Return only the tags separated by commas, no additional text or formatting.'
        },
        {
          role: 'user',  
          content: `Generate tags for this text:\n\n${text}`
        }
      ];

      const response = await this.callOpenAI(messages, {
        model: 'gpt-3.5-turbo',
        maxTokens: 100,
        temperature: 0.2
      });

      // Parse the response into an array of tags
      const tags = response.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0);
      return tags.slice(0, 5); // Limit to 5 tags
    } catch (error) {
      console.error('❌ OpenAI tag generation failed:', error);
      throw error;
    }
  }

  async checkGrammarWithOpenAI(text) {
    try {
      const messages = [
        {
          role: 'system',
          content: 'You are a grammar checker. Identify grammar, spelling, and punctuation errors in the given text. For each error, provide: the incorrect text, the correction, and a brief explanation. Format as JSON array with objects containing "error", "correction", and "explanation" fields.'
        },
        {
          role: 'user',
          content: `Check grammar in this text:\n\n${text}`
        }
      ];

      const response = await this.callOpenAI(messages, {
        model: 'gpt-3.5-turbo',
        maxTokens: 500,
        temperature: 0.1
      });

      // Try to parse JSON response
      try {
        const errors = JSON.parse(response);
        return Array.isArray(errors) ? errors.slice(0, 10) : [];
      } catch (parseError) {
        // If not JSON, parse manually
        return this.parseGrammarResponse(response);
      }
    } catch (error) {
      console.error('❌ OpenAI grammar check failed:', error);
      throw error;
    }
  }

  parseGrammarResponse(response) {
    // Simple parsing for non-JSON responses
    const lines = response.split('\n').filter(line => line.trim());
    const errors = [];
    
    for (const line of lines.slice(0, 10)) {
      if (line.includes(':') || line.includes('->') || line.includes('→')) {
        errors.push({
          error: line.substring(0, 50),
          correction: 'See suggestion',
          explanation: line
        });
      }
    }
    
    return errors;
  }

  simpleTranslationFallback(text, languageName) {
    console.log('🔧 Using simple word substitution fallback...');
    
    const commonTranslations = {
      'Spanish': {
        'hello': 'hola', 'goodbye': 'adiós', 'thank you': 'gracias', 'please': 'por favor',
        'yes': 'sí', 'no': 'no', 'good': 'bueno', 'bad': 'malo', 'water': 'agua', 'food': 'comida',
        'start': 'empezar', 'writing': 'escribiendo', 'note': 'nota', 'here': 'aquí', 'your': 'tu',
        'write': 'escribir', 'the': 'el', 'and': 'y', 'or': 'o', 'but': 'pero', 'with': 'con',
        'time': 'tiempo', 'day': 'día', 'work': 'trabajo', 'home': 'casa', 'friend': 'amigo',
        'market': 'mercado', 'yesterday': 'ayer', 'today': 'hoy', 'tomorrow': 'mañana',
        'money': 'dinero', 'fruit': 'fruta', 'vegetables': 'verduras', 'cafe': 'café',
        'going': 'yendo', 'buying': 'comprando', 'eating': 'comiendo', 'talking': 'hablando'
      },
      'French': {
        'hello': 'bonjour', 'goodbye': 'au revoir', 'thank you': 'merci', 'please': 's\'il vous plaît',
        'yes': 'oui', 'no': 'non', 'good': 'bon', 'bad': 'mauvais', 'water': 'eau', 'food': 'nourriture',
        'the': 'le', 'and': 'et', 'or': 'ou', 'but': 'mais', 'with': 'avec',
        'time': 'temps', 'day': 'jour', 'work': 'travail', 'home': 'maison', 'friend': 'ami'
      },
      'German': {
        'hello': 'hallo', 'goodbye': 'auf wiedersehen', 'thank you': 'danke', 'please': 'bitte',
        'yes': 'ja', 'no': 'nein', 'good': 'gut', 'bad': 'schlecht', 'water': 'wasser', 'food': 'essen',
        'the': 'der', 'and': 'und', 'or': 'oder', 'but': 'aber', 'with': 'mit',
        'time': 'zeit', 'day': 'tag', 'work': 'arbeit', 'home': 'haus', 'friend': 'freund'
      }
    };

    let translatedText = text;
    let translatedWords = 0;
    const translations = commonTranslations[languageName];
    
    if (translations) {
      Object.entries(translations).forEach(([english, translated]) => {
        const regex = new RegExp(`\\b${english}\\b`, 'gi');
        const matches = text.match(regex);
        if (matches) {
          translatedWords += matches.length;
          translatedText = translatedText.replace(regex, translated);
        }
      });
    }

    // Provide more informative feedback
    if (translatedWords === 0) {
      const result = `🌐 [${languageName}] Basic Translation:\n${text}\n\n📝 Note: No common words found for translation. This text appears to contain specialized vocabulary. For accurate translation, please use professional translation services or add OpenAI API credits.`;
      console.log('📝 Simple fallback result (no translations):', result.substring(0, 100));
      return result;
    } else {
      const result = `🌐 [${languageName}] Partial Translation:\n${translatedText}\n\n📊 Translated ${translatedWords} common word(s). For complete and accurate translation, please use professional services or add OpenAI API credits.`;
      console.log('📝 Simple fallback result:', result.substring(0, 100));
      return result;
    }
  }

  async identifyGlossaryTerms(text) {
    if (!text || text.trim().length < 50) {
      return [];
    }

    try {
      // Simple glossary term identification based on common patterns
      const words = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
      const technicalTerms = text.match(/\b\w+(?:tion|sion|ment|ness|ity|ing|ed)\b/gi) || [];
      
      const uniqueTerms = [...new Set([...words, ...technicalTerms])]
        .filter(term => term.length > 4)
        .slice(0, 5);

      return uniqueTerms.map(term => ({
        word: term,
        definition: `Definition for "${term}" - specialized term found in the text`
      }));
    } catch (error) {
      console.error('Glossary identification failed:', error);
      return [];
    }
  }

  // Simple fallback translation with common word substitutions
  simpleTranslationFallback(text, languageName) {
    // Common word translations for demonstration
    const commonTranslations = {
      'Spanish': {
        'hello': 'hola',
        'goodbye': 'adiós',
        'yes': 'sí',
        'no': 'no',
        'please': 'por favor',
        'thank you': 'gracias',
        'welcome': 'bienvenido',
        'note': 'nota',
        'text': 'texto',
        'translate': 'traducir'
      },
      'French': {
        'hello': 'bonjour',
        'goodbye': 'au revoir',
        'yes': 'oui',
        'no': 'non',
        'please': 's\'il vous plaît',
        'thank you': 'merci',
        'welcome': 'bienvenue',
        'note': 'note',
        'text': 'texte',
        'translate': 'traduire'
      },
      'German': {
        'hello': 'hallo',
        'goodbye': 'auf wiedersehen',
        'yes': 'ja',
        'no': 'nein',
        'please': 'bitte',
        'thank you': 'danke',
        'welcome': 'willkommen',
        'note': 'notiz',
        'text': 'text',
        'translate': 'übersetzen'
      }
    };

    const translations = commonTranslations[languageName] || {};
    let translatedText = text.toLowerCase();

    // Apply simple word substitutions
    Object.entries(translations).forEach(([english, foreign]) => {
      const regex = new RegExp(`\\b${english}\\b`, 'gi');
      translatedText = translatedText.replace(regex, foreign);
    });

    return `[${languageName}] ${translatedText}`;
  }
}

export default AIManager;
