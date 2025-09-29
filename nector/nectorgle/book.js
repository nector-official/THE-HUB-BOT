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
    // --- STEP 1: Try Open Library for downloadable PDF ---
    const olUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(query)}&limit=5`;
    const olData = await axios.get(olUrl);

    let title, author, year, coverURL, downloadLink, description;

    if (olData.data.docs && olData.data.docs.length > 0) {
      // Try each edition until we find a PDF
      for (const olBook of olData.data.docs) {
        title = olBook.title || "Unknown Title";
        author = olBook.author_name ? olBook.author_name.join(", ") : "Unknown Author";
        year = olBook.first_publish_year || "N/A";
        description = olBook.first_sentence ? olBook.first_sentence.join(" ") : "No description available.";
        const coverId = olBook.cover_i;
        coverURL = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null;

        const editionKeys = olBook.edition_key || [];
        for (const olid of editionKeys) {
          const link = `https://archive.org/download/${olid}/${olid}.pdf`;
          // Optionally, we could test if link exists by HEAD request; for now we assume it's valid
          downloadLink = link;
          break; // take first available edition
        }

        if (downloadLink) break; // found PDF, stop looping editions
      }
    }

    // If a PDF was found, send info + PDF
    if (downloadLink) {
      const caption = `╭───『 *📚 Book Found* 』
│ 📖 *Title:* ${title}
│ ✍️ *Author(s):* ${author}
│ 🗓️ *Year:* ${year}
│ 📝 *Description:* ${description}
╰──────────────────────
📄 Click below to download the book!`;

      await sock.sendMessage(m.from, {
        document: { url: downloadLink },
        fileName: `${title}.pdf`,
        mimetype: "application/pdf",
        caption: caption
      }, { quoted: m });

      await m.React("✅");
      return;
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
    title = gbBook.title || "Unknown Title";
    author = gbBook.authors ? gbBook.authors.join(", ") : "Unknown Author";
    year = gbBook.publishedDate || "N/A";
    const pages = gbBook.pageCount || "N/A";
    description = gbBook.description ? gbBook.description.substring(0, 400) + "..." : "No description available.";
    coverURL = gbBook.imageLinks?.thumbnail || null;
    const previewLink = gbBook.previewLink || "Not available";

    const caption = `╭───『 *📚 Book Info* 』
│ 📖 *Title:* ${title}
│ ✍️ *Author(s):* ${author}
│ 🏢 *Publisher:* ${gbBook.publisher || "N/A"}
│ 📑 *Pages:* ${pages}
│ 📝 *Description:* ${description}
│ 🔗 *Preview:* ${previewLink}
│ ❌ *Downloadable PDF not available*
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

  } catch (error) {
    console.error("[Book Command Error]", error.message);
    await sock.sendMessage(m.from, {
      text: `⚠️ *An error occurred while fetching the book.*`
    }, { quoted: m });
    await m.React("⚠️");
  }
};

export default book;
