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

    let title, author, year, coverURL, downloadLink;

    if (olData.data.docs && olData.data.docs.length > 0) {
      const olBook = olData.data.docs[0];
      title = olBook.title || "Unknown Title";
      author = olBook.author_name ? olBook.author_name.join(", ") : "Unknown Author";
      year = olBook.first_publish_year || "N/A";
      const coverId = olBook.cover_i;
      coverURL = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null;

      const olid = olBook.edition_key ? olBook.edition_key[0] : null;
      downloadLink = olid ? `https://archive.org/download/${olid}/${olid}.pdf` : null;
    }

    // --- STEP 2: Fallback to Google Books (if no PDF found) ---
    if (!downloadLink) {
      const gbUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1`;
      const gbData = await axios.get(gbUrl);

      if (!gbData.data.items || gbData.data.items.length === 0) {
        return sock.sendMessage(m.from, {
          text: `❌ *No book found for:* _${query}_`
        }, { quoted: m });
      }

      const gbBook = gbData.data.items[0].volumeInfo;
      title = gbBook.title || "Unknown Title";
      author = gbBook.authors ? gbBook.authors.join(", ") : "Unknown Author";
      year = gbBook.publishedDate || "N/A";
      const pages = gbBook.pageCount || "N/A";
      const desc = gbBook.description ? gbBook.description.substring(0, 400) + "..." : "No description available.";
      coverURL = gbBook.imageLinks?.thumbnail || null;
      const previewLink = gbBook.previewLink || "Not available";

      downloadLink = null; // Google Books usually does not provide PDF
      const caption = `╭───『 *📚 Book Info* 』
│ 📖 *Title:* ${title}
│ ✍️ *Author(s):* ${author}
│ 🏢 *Publisher:* ${gbBook.publisher || "N/A"}
│ 📑 *Pages:* ${pages}
│ 📝 *Description:* ${desc}
│ 🔗 *Preview:* ${previewLink}
╰──────────────────────`;

      if (coverURL) {
        await sock.sendMessage(m.from, {
          image: { url: coverURL },
          caption: caption
        }, { quoted: m });
      } else {
        await sock.sendMessage(m.from, { text: caption }, { quoted: m });
      }
      await m.React("✅");
      return;
    }

    // --- STEP 3: Send both info + PDF (Open Library) ---
    const caption = `╭───『 *📚 Book Found* 』
│ 📖 *Title:* ${title}
│ ✍️ *Author(s):* ${author}
│ 🗓️ *Year:* ${year}
╰──────────────────────
📄 Click below to download the book!`;

    await sock.sendMessage(m.from, {
      document: { url: downloadLink },
      fileName: `${title}.pdf`,
      mimetype: "application/pdf",
      caption: caption
    }, { quoted: m });

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
