# ClassSnag 🎯

**Never miss your favorite fitness class again!**

ClassSnag is a Chrome extension that automatically monitors and books fitness classes on VirtuaGym-powered booking systems. Whether it's yoga, spin, CrossFit, or any other class, ClassSnag helps you snag that spot before it fills up.

## ✨ Features

- **🔄 Auto Refresh** - Continuously monitor class availability when classes are full or not yet open for booking
- **⚡ Instant Booking** - Automatically click the "Book" button the moment a spot opens (either when booking launches or someone cancels)
- **🌐 Universal Support** - Works with any gym or fitness center that uses VirtuaGym (*.virtuagym.com)
- **⚙️ Customizable** - Set your own refresh interval from 1-60 seconds
- **💾 Persistent Settings** - Your preferences sync across all your Chrome devices
- **🎨 Modern UI** - Clean, intuitive interface with toggle switches and sliders

## 🚀 Installation

### From Source (Developer Mode)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the ClassSnag directory
6. The extension icon will appear in your Chrome toolbar

## 📖 How to Use

1. **Navigate to a VirtuaGym class page**
   - Go to your gym's VirtuaGym booking site (e.g., `https://your-gym.virtuagym.com/classes`)
   - Click on any class to view its details

2. **Configure ClassSnag**
   - Click the ClassSnag extension icon in your toolbar
   - Enable **Auto Refresh** to keep checking for available spots
   - Adjust the refresh interval (default: 30 seconds)
   - Enable **Auto Book** to automatically reserve the class when a spot opens (booking launch or cancellation)

3. **Let it run**
   - ClassSnag will monitor the page and automatically:
     - Refresh when the class is fully booked
     - Refresh when it's too early to book
     - Click the booking button when enabled and a spot opens up
     - Stop monitoring if you've already booked or it's too late

## 🎯 Use Cases

- **Popular morning classes** that fill up within seconds of opening
- **Classes that open for booking** at specific times (e.g., 7 days in advance at midnight)
- **Cancellation monitoring** - instantly grab spots when someone cancels their reservation
- **Waitlist scenarios** - be first in line when spots become available
- **Limited capacity classes** that are always in high demand

## ⚙️ Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Auto Refresh | Continuously check for class availability | Off |
| Refresh Interval | How often to reload the page (1-60 seconds) | 30s |
| Auto Book | Automatically click the booking button when a spot opens (booking launch or cancellation) | Off |

## 🔒 Privacy & Permissions

ClassSnag requires minimal permissions:
- **activeTab** - To interact with VirtuaGym class pages
- **storage** - To save your preferences
- **host_permissions** - Access to `*.virtuagym.com` domains only

ClassSnag does NOT:
- Collect any personal data
- Track your browsing history
- Send data to external servers
- Access your login credentials

All processing happens locally in your browser.

## 🛠️ Technical Details

- **Manifest Version**: 3 (latest Chrome extension standard)
- **Supported Sites**: All VirtuaGym-powered booking systems
- **Browser**: Chrome (and Chromium-based browsers)
- **Detection Method**: MutationObserver with polling fallback for reliability

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs or issues
- Suggest new features
- Submit pull requests
- Improve documentation

## 📝 License

This project is provided as-is for personal use.

## ⚠️ Disclaimer

ClassSnag is an unofficial tool and is not affiliated with or endorsed by VirtuaGym. Use responsibly and in accordance with your gym's terms of service. Automated booking may be against some gyms' policies - check with your facility before use.

---

**Made with ❤️ for fitness enthusiasts who are tired of missing their favorite classes**
