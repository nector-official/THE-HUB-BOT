import config from '../../config.cjs';
import axios from 'axios';

const book = async (m, sock) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix)
    ? m.body.slice(prefix.length).split(" ")[0].toLowerCase()
    : '';
  const args = m.body.trim().split(" ").slice(1);
  const query = args.join(" ");

  if (cmd !== "book") return;

  if (!query) {
    await sock.sendMessage(m.from, {
      text: `❌ *Please provide a book title!*\n💡 Try: *${prefix}book Pride and Prejudice*`
    }, { quoted: m });
    return;
  }

  await m.React("📚");

  try {
    // --- STEP 1: Try Open Library ---
    const olUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(query)}&limit=1`;
    const olData = await axios.get(olUrl);

    if (olData.data.docs && olData.data.docs.length > 0) {
      const olBook = olData.data.docs[0];
      const title = olBook.title || "Unknown Title";
      const author = olBook.author_name ? olBook.author_name.join(", ") : "Unknown Author";
      const year = olBook.first_publish_year || "N/A";
      const coverId = olBook.cover_i;
      const coverURL = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null;

      const olid = olBook.edition_key ? olBook.edition_key[0] : null;
      const downloadLink = olid ? `https://archive.org/download/${olid}/${olid}.pdf` : null;

      if (downloadLink) {
        // Send PDF from Open Library
        await sock.sendMessage(m.from, {
          document: { url: downloadLink },
          fileName: `${title}.pdf`,
          mimetype: "application/pdf",
          caption: `📖 *${title}* by ${author}\n🗓️ Published: ${year}\n✅ Downloaded from OpenLibrary`
        }, { quoted: m });
        await m.React("✅");
        return; // stop after sending
      }
    }

    // --- STEP 2: Fallback to Google Books ---
    const gbUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1`;
    const gbData = await axios.get(gbUrl);

    if (!gbData.data.items || gbData.data.items.length === 0) {
      return sock.sendMessage(m.from, {
        text: `❌ *No book found for:* _${query}_`
      }, { quoted: m });
    }

    const gbBook = gbData.data.items[0].volumeInfo;
    const gbTitle = gbBook.title || "Unknown Title";
    const gbAuthors = gbBook.authors ? gbBook.authors.join(", ") : "Unknown Author";
    const gbPublisher = gbBook.publisher || "Unknown Publisher";
    const gbPages = gbBook.pageCount || "N/A";
    const gbDesc = gbBook.description ? gbBook.description.substring(0, 400) + "..." : "No description available.";
    const gbThumb = gbBook.imageLinks?.thumbnail || null;
    const gbPreview = gbBook.previewLink || "Not available";

    const caption = `╭───『 *📚 Book Info* 』
│ 📖 *Title:* ${gbTitle}
│ ✍️ *Author(s):* ${gbAuthors}
│ 🏢 *Publisher:* ${gbPublisher}
│ 📑 *Pages:* ${gbPages}
│ 📝 *Description:* ${gbDesc}
│ 🔗 *Preview:* ${gbPreview}
╰──────────────────────`;

    if (gbThumb) {
      await sock.sendMessage(m.from, {
        image: { url: gbThumb },
        caption: caption
      }, { quoted: m });
    } else {
      await sock.sendMessage(m.from, { text: caption }, { quoted: m });
    }

    await m.React("✅");

  } catch (error) {
    console.error("[Book Command Error]", error.message);
    await sock.sendMessage(m.from, {
      text: `⚠️ *An error occurred while fetching the book.*`
    }, { quoted: m });
    await m.React("⚠️");
  }
};

export default book;
