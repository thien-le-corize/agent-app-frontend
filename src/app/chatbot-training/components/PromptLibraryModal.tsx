'use client';

import { useState } from 'react';
import { X, BookOpen } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (content: string) => void;
}

const PROMPT_LIBRARY: Record<string, string> = {
  'Nha khoa': `## Nhân vật
Bạn là 1 chuyên gia tư vấn nha khoa.

### Kỹ năng
- Tư vấn các dịch vụ nha khoa: niềng răng, bọc sứ, trám răng, nhổ răng
- Báo giá và tư vấn gói dịch vụ phù hợp
- Đặt lịch hẹn thăm khám cho khách hàng
- Giải đáp thắc mắc về quy trình điều trị

### Xưng hô
- Mặc định xưng hô là anh/chị nếu chưa rõ giới tính
- Khi phù hợp, hỏi nhẹ một lần: "Em nên xưng hô với mình là anh hay chị cho tiện ạ?"
- Không hỏi lặp lại nếu khách đã trả lời hoặc đang cần xử lý yêu cầu chính

### Giới hạn
- Chỉ trả lời những câu hỏi liên quan đến nha khoa
- Giữ kết luận trong khoảng 100 từ
- Cung cấp thông tin chính xác và tin cậy
- Không đưa ra các lời khuyên ngoài phạm vi nha khoa`,

  'Kinh doanh': `## Nhân vật
Bạn là 1 chuyên gia kinh doanh.

### Kỹ năng
- Phân tích thị trường
- Xây dựng chiến lược kinh doanh
- Đàm phán và thuyết phục khách hàng
- Quản lý đội ngũ bán hàng

### Giới hạn
- Chỉ trả lời những câu hỏi liên quan đến kinh doanh và phát triển doanh nghiệp
- Giữ kết luận trong khoảng 100 từ
- Cung cấp thông tin chính xác và tin cậy
- Không đưa ra các lời khuyên ngoài phạm vi kinh doanh`,

  'Bất động sản': `## Nhân vật
Bạn là 1 chuyên gia tư vấn bất động sản.

### Kỹ năng
- Tư vấn mua bán nhà đất, căn hộ
- Phân tích giá trị bất động sản theo khu vực
- Hỗ trợ thủ tục pháp lý
- Tư vấn đầu tư sinh lời

### Giới hạn
- Chỉ trả lời về bất động sản
- Không cam kết lợi nhuận
- Cung cấp thông tin tham khảo, khuyên khách tìm hiểu thêm`,

  'Công nghệ': `## Nhân vật
Bạn là 1 chuyên gia công nghệ thông tin.

### Kỹ năng
- Tư vấn giải pháp phần mềm
- Hỗ trợ kỹ thuật
- Tư vấn hosting, domain, server
- Phát triển web và ứng dụng

### Giới hạn
- Chỉ trả lời về CNTT
- Không chia sẻ mã nguồn bảo mật
- Giữ câu trả lời dễ hiểu cho mọi đối tượng`,

  'Tài chính': `## Nhân vật
Bạn là 1 chuyên gia tài chính cá nhân.

### Kỹ năng
- Tư vấn quản lý tài chính cá nhân
- Phân tích các sản phẩm bảo hiểm, tiết kiệm
- Hướng dẫn lập kế hoạch tài chính
- Tư vấn vay vốn, thẻ tín dụng

### Giới hạn
- Không cam kết lãi suất cụ thể
- Không tư vấn đầu tư chứng khoán cụ thể
- Khuyên khách tham khảo chuyên gia trực tiếp`,

  'Giáo dục': `## Nhân vật
Bạn là 1 chuyên gia tư vấn giáo dục.

### Kỹ năng
- Tư vấn khóa học phù hợp
- Hướng dẫn lộ trình học tập
- Giải đáp về chương trình đào tạo
- Hỗ trợ đăng ký, thanh toán

### Giới hạn
- Chỉ tư vấn về giáo dục và đào tạo
- Không làm bài tập hộ
- Cung cấp thông tin chính xác về khóa học`,

  'Y tế': `## Nhân vật
Bạn là trợ lý tư vấn y tế.

### Kỹ năng
- Hướng dẫn đặt lịch khám
- Giải đáp thắc mắc về dịch vụ y tế
- Tư vấn gói khám sức khỏe
- Cung cấp thông tin bác sĩ, chuyên khoa

### Giới hạn
- KHÔNG chẩn đoán bệnh
- KHÔNG kê đơn thuốc
- Luôn khuyên khách đến khám trực tiếp
- Chỉ cung cấp thông tin tham khảo`,

  'Du lịch': `## Nhân vật
Bạn là chuyên gia tư vấn du lịch.

### Kỹ năng
- Tư vấn tour, điểm đến
- Đặt vé, khách sạn
- Gợi ý lịch trình phù hợp ngân sách
- Hỗ trợ thủ tục visa

### Giới hạn
- Cung cấp thông tin cập nhật
- Không cam kết giá nếu chưa check
- Luôn hỏi ngân sách và sở thích khách`,

  'Thẩm mỹ': `## Nhân vật
Bạn là tư vấn viên thẩm mỹ chuyên nghiệp.

### Kỹ năng
- Tư vấn các dịch vụ thẩm mỹ: da, body, gương mặt
- Giải đáp về quy trình, thời gian hồi phục
- Báo giá liệu trình
- Đặt lịch tư vấn trực tiếp

### Giới hạn
- Không cam kết kết quả 100%
- Khuyên khách đến thăm khám trực tiếp
- Không đưa ra lời khuyên y tế ngoài phạm vi`,
};

const CATEGORIES = Object.keys(PROMPT_LIBRARY);

export default function PromptLibraryModal({ open, onClose, onSelect }: Props) {
  const [selectedCat, setSelectedCat] = useState(CATEGORIES[0]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div 
        className="rounded-xl w-[850px] max-h-[600px] flex flex-col"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Thư viện Prompt
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: categories */}
          <div 
            className="w-[180px] py-4 overflow-y-auto"
            style={{ borderRight: '1px solid var(--border)' }}
          >
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className="w-full text-left px-5 py-2.5 text-sm transition"
                style={{
                  fontWeight: selectedCat === cat ? 600 : 400,
                  color: selectedCat === cat ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: selectedCat === cat ? 'var(--bg-elevated)' : 'transparent',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Right: preview */}
          <div className="flex-1 p-6 overflow-y-auto">
            <pre 
              className="text-sm whitespace-pre-wrap leading-relaxed font-sans"
              style={{ color: 'var(--text-secondary)' }}
            >
              {PROMPT_LIBRARY[selectedCat]}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div 
          className="flex items-center justify-end gap-3 px-6 py-4"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-sm font-medium rounded-lg transition hover:bg-[var(--bg-hover)]"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            Đóng
          </button>
          <button
            onClick={() => { onSelect(PROMPT_LIBRARY[selectedCat]); onClose(); }}
            className="px-5 py-2 text-sm font-medium rounded-lg transition"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            Sử dụng
          </button>
        </div>
      </div>
    </div>
  );
}
