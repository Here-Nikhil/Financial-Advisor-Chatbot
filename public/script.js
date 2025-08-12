document.addEventListener('DOMContentLoaded', function() {
	const messagesContainer = document.getElementById('messages');
	const userInput = document.getElementById('user-input');
	const sendButton = document.getElementById('send-btn');
	const typingIndicator = document.getElementById('typing');
	const darkModeToggle = document.querySelector('.dark-mode-toggle');
	const clearChatButton = document.querySelector('.clear-chat');
	const suggestionsContainer = document.getElementById('suggestions');
	const statusBar = document.getElementById('status-bar');
	const exampleQuestions = document.querySelectorAll('.example-question');
	let lastRequestTime = 0;
	const RATE_LIMIT = 2000;

	const suggestionList = [
		"How do I track mileage expenses?",
		"What tax deductions can I claim as a freelancer?",
		"How should I save for retirement as a gig worker?",
		"Do I need to pay quarterly taxes?",
		"What's the best way to handle inconsistent income?",
		"How do I set up a budget as a freelancer?",
		"What are the best investment options for gig workers?"
	];

	// Initialize chat anew on every load
	initializeChat();
	autoResizeTextarea();
	applyDarkModePreference();

	sendButton.addEventListener('click', debounce(sendMessage, 300));
	userInput.addEventListener('keypress', (e) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	});
	userInput.addEventListener('input', autoResizeTextarea);
	// FIX: Pass the textarea value instead of the event
	userInput.addEventListener('input', debounce(() => showSuggestions(userInput.value), 300));
	darkModeToggle.addEventListener('click', toggleDarkMode);
	clearChatButton.addEventListener('click', clearChat);

	exampleQuestions.forEach(question => {
		question.addEventListener('click', () => {
			userInput.value = question.textContent;
			sendMessage();
		});
		question.addEventListener('keypress', (e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				userInput.value = question.textContent;
				sendMessage();
			}
		});
	});

	async function sendMessage() {
		const query = sanitizeInput(userInput.value.trim());
		if (!query || sendButton.disabled) return;

		const now = Date.now();
		if (now - lastRequestTime < RATE_LIMIT) {
			addMessage('Please wait a moment before sending another message.', 'bot');
			return;
		}

		addMessage(query, 'user');
		userInput.value = '';
		autoResizeTextarea();
		suggestionsContainer.style.display = 'none';

		sendButton.disabled = true;
		typingIndicator.style.display = 'block';
		statusBar.textContent = 'Processing...';
		lastRequestTime = now;

		try {
			const response = await fetchWithRetry('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query })
			}, 3);

			const data = await response.json();
			addMessage(data.response, 'bot');
			statusBar.textContent = 'Online';
		} catch (error) {
			addMessage('Sorry, I encountered an error. Please try again later.', 'bot');
			statusBar.textContent = 'Error';
			console.error('Fetch Error:', error);
		} finally {
			typingIndicator.style.display = 'none';
			sendButton.disabled = false;
			userInput.focus();
		}
	}

	function addMessage(text, sender, id = Date.now()) {
		const messageDiv = document.createElement('div');
		messageDiv.classList.add('message', `${sender}-message`);
		messageDiv.dataset.id = id;

		const contentDiv = document.createElement('div');
		contentDiv.classList.add('message-content');
		contentDiv.textContent = text;

		const timestampDiv = document.createElement('div');
		timestampDiv.classList.add('message-timestamp');
		timestampDiv.textContent = new Date().toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit'
		});

		const actionsDiv = document.createElement('div');
		actionsDiv.classList.add('message-actions');
		actionsDiv.innerHTML = `
			<button class="message-action edit" aria-label="Edit message">✏️</button>
			<button class="message-action delete" aria-label="Delete message">🗑️</button>
		`;

		const reactionsDiv = document.createElement('div');
		reactionsDiv.classList.add('message-reactions');
		reactionsDiv.innerHTML = `
			<button class="reaction-btn" aria-label="Like">👍</button>
			<button class="reaction-btn" aria-label="Dislike">👎</button>
			<button class="reaction-btn" aria-label="Question">❓</button>
		`;

		messageDiv.appendChild(contentDiv);
		messageDiv.appendChild(timestampDiv);
		messageDiv.appendChild(actionsDiv);
		messageDiv.appendChild(reactionsDiv);
		messagesContainer.appendChild(messageDiv);

		actionsDiv.querySelector('.edit').addEventListener('click', () => editMessage(messageDiv));
		actionsDiv.querySelector('.delete').addEventListener('click', () => deleteMessage(messageDiv));
		reactionsDiv.querySelectorAll('.reaction-btn').forEach(btn => {
			btn.addEventListener('click', () => addReaction(messageDiv, btn.textContent));
		});

		messagesContainer.scrollTop = messagesContainer.scrollHeight;
	}

	function editMessage(messageDiv) {
		const contentDiv = messageDiv.querySelector('.message-content');
		userInput.value = contentDiv.textContent;
		deleteMessage(messageDiv);
		userInput.focus();
	}

	function deleteMessage(messageDiv) {
		messageDiv.remove();
	}

	function addReaction(messageDiv, reaction) {
		const contentDiv = messageDiv.querySelector('.message-content');
		contentDiv.textContent += ` [${reaction}]`;
	}

	function showSuggestions(input) {
		// FIX: Always make sure input is a string
		input = String(input || "");

		suggestionsContainer.innerHTML = '';
		if (!input) {
			suggestionsContainer.style.display = 'none';
			return;
		}

		const matches = suggestionList.filter(s =>
			s.toLowerCase().includes(input.toLowerCase())
		).slice(0, 5);

		if (matches.length) {
			matches.forEach(match => {
				const item = document.createElement('div');
				item.classList.add('suggestion-item');
				item.textContent = match;
				item.addEventListener('click', () => {
					userInput.value = match;
					suggestionsContainer.style.display = 'none';
					sendMessage();
				});
				suggestionsContainer.appendChild(item);
			});
			suggestionsContainer.style.display = 'block';
		} else {
			suggestionsContainer.style.display = 'none';
		}
	}

	function sanitizeInput(input) {
		const div = document.createElement('div');
		div.textContent = input;
		return div.innerHTML;
	}

	function initializeChat() {
		messagesContainer.innerHTML = ''; // Clear messages on every load
		setTimeout(() => {
			addMessage('Hello! I\'m your Gig Worker Finance Advisor. I can help with taxes, expenses, retirement planning, and more. What’s on your mind?', 'bot');
		}, 500);
	}

	function clearChat() {
		messagesContainer.innerHTML = '';
		addMessage('Chat cleared! How can I assist you now?', 'bot');
	}

	function autoResizeTextarea() {
		userInput.style.height = 'auto';
		userInput.style.height = `${Math.min(userInput.scrollHeight, 150)}px`;
	}

	function toggleDarkMode() {
		document.body.classList.toggle('dark-mode');
		darkModeToggle.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
		localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
	}

	function applyDarkModePreference() {
		if (localStorage.getItem('darkMode') === 'true') {
			document.body.classList.add('dark-mode');
			darkModeToggle.textContent = '☀️';
		}
	}

	async function fetchWithRetry(url, options, retries) {
		for (let i = 0; i < retries; i++) {
			try {
				const response = await fetch(url, options);
				if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
				return response;
			} catch (error) {
				if (i === retries - 1) throw error;
				await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
			}
		}
	}

	function debounce(func, wait) {
		let timeout;
		return function(...args) {
			clearTimeout(timeout);
			timeout = setTimeout(() => func.apply(this, args), wait);
		};
	}
});