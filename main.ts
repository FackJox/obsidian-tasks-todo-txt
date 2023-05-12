/**
 * TodoPlugin for Obsidian
 * 
 * This plugin keeps track of all the todo items in Markdown files in the vault
 * and updates a `todo.txt` file accordingly. It listens for create, modify, and
 * delete events on files in the vault, and updates the todo items list based on
 * the presence of the #todo tag in the files.
 * 
 * The plugin uses the following notations:
 * - 📅 for due dates
 * - 🔁 for recurrence
 * - 🛈, 🛆, and 🛇 for priorities (A, B, and C respectively)
 * 
 * @author Your Name
 * @version 1.0
 */


import { Plugin } from 'obsidian';

export default class TodoPlugin extends Plugin {
  async onload() {
  // Log the loading of the plugin and update the todo.txt file

    console.log('Loading Todo Plugin');
    await this.updateTodoFile();

    // Register an event listener for todo.txt modifications:

this.registerEvent(
  this.app.vault.on('modify', async (file) => {
    if (file.path === 'todo.txt') {
      await this.updateVaultTodos();
    }
  })
);

    // Register event listeners for file modifications, deletions, and creations
    this.registerEvent(
      this.app.vault.on('modify', async (file) => {
        // Don't trigger if todo.txt is modified, check if modified file has #todo tag, and update the todo.txt file accordingly

        if (file.path === 'todo.txt') {
          return;
        }

        if ((await this.app.vault.read(file)).includes('#todo')) {
          await this.updateTodoFile();
        }
      })
    );

    // Register an event listener for when a file is deleted
    this.registerEvent(
      this.app.vault.on('delete', async (file) => {
        // Check if deleted file has #todo tag and update the todo.txt file accordingly
        if (file.path.includes('#todo')) {
          await this.updateTodoFile();
        }
      })
    );

    // Register an event listener for when a new file is created
    this.registerEvent(
      this.app.vault.on('create', async (file) => {
        // Check if created file has #todo tag and update the todo.txt file accordingly
        if ((await this.app.vault.read(file)).includes('#todo')) {
          await this.updateTodoFile();
        }
      })
    );

  }

  // Create the updateVaultTodos function. This function will read the contents of todo.txt, parse the todo items, and update the corresponding items in the vault.
async updateVaultTodos() {
  // Read the contents of the todo.txt file
  const todoTxtContent = await this.app.vault.read(this.app.vault.getAbstractFileByPath('todo.txt'));

  // Parse the todo items from the todo.txt content
  const todoItems = this.parseTodoTxt(todoTxtContent);

  // Update the corresponding todo items in the vault
  await this.updateVaultTodoItems(todoItems);

  function parseTodoTxt(todoTxtContent) {
    const obsidianItems = todoItems.map(async (item) => {
      // Extract and format the todo items for Obsidian Tasks
    
      const items = item
        .split('\n')
        .filter((line) => (line.includes('- [ ]') || line.includes('- [x]')) && line.includes('#todo'))

        .map((line) => {
          // Replace todo.txt due date to Obsidian Tasks notations
          line = line.replace('due:', '📅 ');
          line = line.replace('due:', '📅');
    
          // Replace todo.txt recurrence notation to Obsidian recurrence
          line = line.replace('rec:1d', '🔁 every day');
          line = line.replace('rec:1w', '🔁 every week');
          line = line.replace('rec:1m', '🔁 every month');
    
          // Replace todo.txt notations to Obsidian Tasks priority notation
          const priorityRegex = /\((A|B|C)\)/;
          const matches = [...line.matchAll(priorityRegex)];
          let prioritySymbol = '';
          matches.forEach((match) => {
            const priorityChar = match[0];
            if (priorityChar === 'A') {
              prioritySymbol = '\u{23EB}';
            } else if (priorityChar === 'B') {
              prioritySymbol = '\u{1F53A}';
            } else if (priorityChar === 'C') {
              prioritySymbol = '\u{1F53D}';
            }
            line = line.replace(priorityRegex, prioritySymbol);
          })
    
          // Append the priority notation to the end of the line
          if (prioritySymbol) {
            line = `${line} ${prioritySymbol}`;
          }
    
          // Replace todo.txt items with an x at the beginning of the line with Obsidian Tasks checkbox at the start of the line
          line = line.startsWith('x ') ? `- [x] ${line.slice(2)}` : `- [ ] ${line}`;
    
          // Add the #todo tag to the line
          line = `\${line} #todo`;
    
          return line.trim();
        }) || [];
    
      return items;
    });
    
  }


  
}

async updateVaultTodoItems(todoItems) {
  // Iterate over the todo items and update the corresponding files in the vault
  for (const todoItem of todoItems) {
    // Find the file in the vault that contains the todo item
    const file = this.findFileForTodoItem(todoItem);

    // Update the file with the new todo item content
    await this.updateFileWithTodoItem(file, todoItem);
  }
}



  async updateTodoFile() {
    // Get all the Markdown notes in the vault, filter out notes without the #todo tag and get the todo items from each note
    const markdownFiles = this.getMarkdownFiles();

    const todoNotes = markdownFiles.filter(async (note) => {
      const content = await this.app.vault.read(note);
      return content.includes('#todo');
    });

    const filteredTodoNotes = todoNotes.filter((note) => note !== undefined);

    // Get the todo items from each note with #todo tag
    const todoItems = filteredTodoNotes.map(async (note) => {
    
      // Extract and format the todo items for todo.txt

      const items = (await this.app.vault.read(note))
        ?.split('\n')
        .filter((line) => (line.includes('- [ ]') || line.includes('- [x]')) && line.includes('#todo'))
        .map((line) => {
          // Replace Obsidian Tasks notations to todo.txt due date
          line = line.replace('📅 ', 'due:');
          line = line.replace('📅', 'due:');

          // Replace Obsidian Tasks recurrence notation to todo.txt recurrence
          line = line.replace('🔁 every day', 'rec:1d');
          line = line.replace('🔁 every week', 'rec:1w');
          line = line.replace('🔁 every month', 'rec:1m');

          // Replace Obsidian Tasks notations to todo.txt priority notation
          const priorityRegex = /[\u{23EB}\u{1F53A}\u{1F53D}]/gu; // use 'g' flag to match all occurrences
          const matches = [...line.matchAll(priorityRegex)];
          let priority = '';
          matches.forEach((match) => {
            const priorityChar = match[0];
            if (priorityChar === '\u{23EB}') {
              priority = '(A)';
            } else if (priorityChar === '\u{1F53A}') {
              priority = '(B)';
            } else if (priorityChar === '\u{1F53D}') {
              priority = '(C)';
            }
            line = line.replace(priorityChar, '');
          });

          // Append the priority notation to the beginning of the line
          if (priority) {
            line = `${priority} ${line}`;
          }

          // Replace ticked off items with x and append to beginning of line
          line = line.includes('- [x] ') ? `x ${line.replace('- [x] ', '')}` : line;

          // Remove the checkbox and any tags from the line
          line = line.replace('- [ ]', '').replace('#todo', '');

          return line.trim();
        }) || [];

      return items;
    });



   

    // Wait for all promises to resolve before continuing
    const allItems = await Promise.all(todoItems);

    // Update the todo.txt file with the latest todo items
    await this.app.vault.adapter.write(
      'todo.txt',
      allItems.flat().join('\n') + '\n'
    );

    console.log('Updated todo.txt file');
  }

      // Get all Markdown files from the vault
  getMarkdownFiles() {
    const { vault } = this.app;
    return vault.getMarkdownFiles();
  }
}
