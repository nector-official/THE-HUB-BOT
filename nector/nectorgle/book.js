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

    let title, author, year, description, downloadLink, previewLink, coverURL;

    if (olData.data.docs && olData.data.docs.length > 0) {
      for (const olBook of olData.data.docs) {
        title = olBook.title || "Unknown Title";
        author = olBook.author_name ? olBook.author_name.join(", ") : "Unknown Author";
        year = olBook.first_publish_year || "N/A";
        description = olBook.first_sentence ? olBook.first_sentence.join(" ") : "No description available.";
        const coverId = olBook.cover_i;
        coverURL = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null;

        const editionKeys = olBook.edition_key || [];
        for (const olid of editionKeys) {
          downloadLink = `https://archive.org/download/${olid}/${olid}.pdf`;
          break; // take first edition with PDF
        }

        if (downloadLink) break;
      }
    }

    // --- STEP 2: Fallback to Google Books if no PDF found ---
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
      description = gbBook.description ? gbBook.description.substring(0, 400) + "..." : "No description available.";
      coverURL = gbBook.imageLinks?.thumbnail || null;
      previewLink = gbBook.previewLink || "https://books.google.com/";
      downloadLink = null; // Google Books cannot provide PDF
    } else {
      previewLink = `https://openlibrary.org/search?q=${encodeURIComponent(query)}`;
    }

    // --- STEP 3: Prepare message with buttons ---
    const caption = `╭───『 *📚 Book Info* 』
│ 📖 *Title:* ${title}
│ ✍️ *Author(s):* ${author}
│ 🗓️ *Year:* ${year}
│ 📝 *Description:* ${description}
╰──────────────────────`;

    const buttons = [];

    if (downloadLink) {
      buttons.push({
        buttonId: `download_pdf_${encodeURIComponent(downloadLink)}`,
        buttonText: { displayText: "✅ Download PDF" },
        type: 1
      });
    }

    if (previewLink) {
      buttons.push({
        buttonId: `read_online_${encodeURIComponent(previewLink)}`,
        buttonText: { displayText: "🔗 Read Online" },
        type: 1
      });
    }

    const buttonMessage = {
      caption,
      buttons,
      headerType: coverURL ? 4 : 1,
      image: coverURL ? { url: coverURL } : undefined,
    };

    await sock.sendMessage(m.from, buttonMessage, { quoted: m });
    await m.React("✅");

  } catch (error) {
    console.error("[Book Command Error]", error.message);
    await sock.sendMessage(m.from, {
      text: `⚠️ *An error occurred while fetching the book.*`
    }, { quoted: m });
    await m.React("⚠️");
  }
};

// --- STEP 4: Handle button clicks ---
export const handleBookButton = async (buttonId, m, sock) => {
  if (!buttonId.startsWith("download_pdf_")) return;

  const pdfUrl = decodeURIComponent(buttonId.replace("download_pdf_", ""));
  const fileName = `${m.body || "book"}.pdf`;

  try {
    await sock.sendMessage(m.from, {
      document: { url: pdfUrl },
      fileName: fileName,
      mimetype: "application/pdf",
      caption: "📄 Here is your downloadable book PDF!"
    }, { quoted: m });

    await m.React("✅");
  } catch (err) {
    console.error("[Book PDF Error]", err.message);
    await sock.sendMessage(m.from, { text: "⚠️ Failed to send PDF." }, { quoted: m });
    await m.React("⚠️");
  }
};

export default book;
  }
};

export default book;
