export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'BUGPET Cyber Lab Platform API',
    version: '1.0.0',
    description: 'API เอกสารสำหรับระบบจำลองช่องโหว่ความปลอดภัยไซเบอร์ BUGPET (Security-First Architecture)',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'แนบ Access Token ใน Header: `Authorization: Bearer <token>`',
      },
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'refreshToken',
        description: 'HttpOnly Cookie สำหรับ Refresh Token',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          code: { type: 'string', example: 'VALIDATION_ERROR' },
          message: { type: 'string', example: 'ข้อความแจ้งเตือนข้อผิดพลาด' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          username: { type: 'string', example: 'attacker01' },
          email: { type: 'string', example: 'user@petbug.io' },
          role: { type: 'string', enum: ['USER', 'ADMIN'], example: 'USER' },
          points: { type: 'integer', example: 250 },
          bio: { type: 'string', nullable: true, example: 'Security Researcher' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Lab: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          title: { type: 'string', example: 'Cafe Club — SQL Injection' },
          description: { type: 'string', example: 'ระบบสมาชิกมีช่องโหว่ SQL Injection...' },
          difficulty: { type: 'string', enum: ['EASY', 'MEDIUM', 'HARD'], example: 'EASY' },
          points: { type: 'integer', example: 100 },
          timeoutMin: { type: 'integer', example: 45 },
          tags: { type: 'array', items: { type: 'string' }, example: ['SQLi', 'OWASP Top 10'] },
          isActive: { type: 'boolean', example: true },
          solvesCount: { type: 'integer', example: 5 },
          isSolved: { type: 'boolean', example: false },
        },
      },
      Badge: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'First Blood' },
          description: { type: 'string', example: 'พิชิตด่านแรกได้สำเร็จ' },
          icon: { type: 'string', example: 'droplet' },
          tier: { type: 'string', enum: ['BRONZE', 'SILVER', 'GOLD'], example: 'BRONZE' },
          points: { type: 'integer', example: 50 },
        },
      },
    },
  },
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'สมัครสมาชิกผู้ใช้งานใหม่',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'email', 'password'],
                properties: {
                  username: { type: 'string', minLength: 3, maxLength: 24, example: 'attacker01' },
                  email: { type: 'string', format: 'email', example: 'user@petbug.io' },
                  password: { type: 'string', minLength: 8, example: 'Password123' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'สมัครสมาชิกสำเร็จ' },
          400: { description: 'ข้อมูลไม่ถูกต้องหรือไม่ปลอดภัย' },
          409: { description: 'ชื่อผู้ใช้หรืออีเมลซ้ำ' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'เข้าสู่ระบบ (ออก Access Token และตั้งค่า HttpOnly Refresh Cookie)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['identifier', 'password'],
                properties: {
                  identifier: { type: 'string', example: 'attacker01' },
                  password: { type: 'string', example: 'Password123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'เข้าสู่ระบบสำเร็จ' },
          401: { description: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        },
      },
    },
    '/api/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'ต่ออายุ Access Token ด้วย Refresh Token Rotation (RTR)',
        responses: {
          200: { description: 'ออก Token ใหม่สำเร็จ' },
          401: { description: 'Refresh Token ไม่ถูกต้องหรือถูกขโมยใช้ซ้ำ' },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'ออกจากระบบ (ล้าง Session ใน DB และลบ Cookie)',
        responses: {
          200: { description: 'ออกจากระบบสำเร็จ' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'ดูข้อมูลโปรไฟล์ส่วนตัวของผู้ใช้ปัจจุบัน',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'สำเร็จ' },
          401: { description: 'ไม่ได้ล็อกอิน' },
        },
      },
      patch: {
        tags: ['Authentication'],
        summary: 'อัปเดตข้อมูล Bio ในโปรไฟล์',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  bio: { type: 'string', maxLength: 280, example: 'Cybersecurity Student' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'อัปเดตโปรไฟล์สำเร็จ' },
        },
      },
    },
    '/api/auth/me/password': {
      post: {
        tags: ['Authentication'],
        summary: 'เปลี่ยนรหัสผ่านผู้ใช้งาน',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword', 'newPassword'],
                properties: {
                  currentPassword: { type: 'string', example: 'Password123' },
                  newPassword: { type: 'string', minLength: 8, example: 'NewPassword999' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'เปลี่ยนรหัสผ่านเรียบร้อย' },
          400: { description: 'รหัสผ่านปัจจุบันไม่ถูกต้อง หรือรหัสใหม่ไม่ปลอดภัย' },
        },
      },
    },
    '/api/labs': {
      get: {
        tags: ['Labs'],
        summary: 'ดึงรายการโจทย์แล็บทั้งหมด (รองรับ Search, Filter difficulty, status)',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'คำค้นหา' },
          { name: 'difficulty', in: 'query', schema: { type: 'string', enum: ['EASY', 'MEDIUM', 'HARD'] } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['all', 'solved', 'unsolved'] } },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['default', 'newest', 'points', 'difficulty'] } },
        ],
        responses: {
          200: { description: 'สำเร็จ (ไม่มีการเปิดเผย Flag)' },
        },
      },
      post: {
        tags: ['Labs'],
        summary: 'สร้างโจทย์แล็บใหม่ (Admin Only)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'description', 'flag'],
                properties: {
                  title: { type: 'string', example: 'New Lab Challenge' },
                  description: { type: 'string', example: 'Lab description...' },
                  difficulty: { type: 'string', enum: ['EASY', 'MEDIUM', 'HARD'], default: 'EASY' },
                  dockerImage: { type: 'string', example: 'bkimminich/juice-shop:latest' },
                  flag: { type: 'string', example: 'PETBUG{secret_flag_123}' },
                  points: { type: 'integer', default: 100 },
                  timeoutMin: { type: 'integer', default: 60 },
                  tags: { type: 'array', items: { type: 'string' }, example: ['Web', 'OWASP'] },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'สร้างโจทย์แล็บสำเร็จ' },
          403: { description: 'เฉพาะผู้ดูแลระบบ' },
        },
      },
    },
    '/api/labs/{id}': {
      get: {
        tags: ['Labs'],
        summary: 'ดูรายละเอียดโจทย์แล็บรายข้อ (ไม่เปิดเผย Flag)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'สำเร็จ' },
          404: { description: 'ไม่พบโจทย์แล็บ' },
        },
      },
      put: {
        tags: ['Labs'],
        summary: 'แก้ไขโจทย์แล็บ (Admin Only)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'แก้ไขสำเร็จ' },
        },
      },
      delete: {
        tags: ['Labs'],
        summary: 'ลบโจทย์แล็บ (Admin Only)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'ลบสำเร็จ' },
        },
      },
    },
    '/api/labs/{id}/toggle': {
      patch: {
        tags: ['Labs'],
        summary: 'เปิด/ปิดสถานะ Active ของโจทย์แล็บ (Admin Only)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'ปรับสถานะสำเร็จ' },
        },
      },
    },
    '/api/labs/{id}/reset': {
      post: {
        tags: ['Labs'],
        summary: 'รีเซ็ตผลการแก้โจทย์ของแล็บนี้ (Admin Only)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'รีเซ็ตสำเร็จ' },
        },
      },
    },
    '/api/solves/labs/{labId}/submit': {
      post: {
        tags: ['Solves'],
        summary: 'ส่ง Flag ตรวจคำตอบ (Timing-Attack Protected & Rate Limited)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'labId', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['flag'],
                properties: {
                  flag: { type: 'string', example: 'PETBUG{sql_1nj3ct10n_m4st3r_cafe}' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Flag ถูกต้อง! ได้รับคะแนนและเหรียญรางวัล' },
          400: { description: 'Flag ไม่ถูกต้อง หรือเคยแก้ไปแล้ว' },
          429: { description: 'ส่งคำตอบบ่อยเกินไป (Rate Limit 10 ครั้ง/นาที)' },
        },
      },
    },
    '/api/solves/my': {
      get: {
        tags: ['Solves'],
        summary: 'ดูประวัติแล็บทั้งหมดที่ตนเองเคยแก้ได้',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'สำเร็จ' },
        },
      },
    },
    '/api/leaderboard': {
      get: {
        tags: ['Leaderboard'],
        summary: 'ตารางคะแนนอันดับผู้เล่น (ตัดบัญชีที่ถูกแบนออกอัตโนมัติ)',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 25 } },
          { name: 'period', in: 'query', schema: { type: 'string', enum: ['all', 'week'], default: 'all' } },
        ],
        responses: {
          200: { description: 'สำเร็จ' },
        },
      },
    },
    '/api/leaderboard/badges': {
      get: {
        tags: ['Leaderboard'],
        summary: 'รายการเหรียญรางวัล (Badges) ทั้งหมดในระบบ',
        responses: {
          200: { description: 'สำเร็จ' },
        },
      },
    },
    '/api/leaderboard/activity': {
      get: {
        tags: ['Leaderboard'],
        summary: 'ฟีดกิจกรรมล่าสุด (Solve feeds & Badges earned)',
        parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 8 } }],
        responses: {
          200: { description: 'สำเร็จ' },
        },
      },
    },
    '/api/leaderboard/stats': {
      get: {
        tags: ['Leaderboard'],
        summary: 'สถิติภาพรวมแพลตฟอร์ม (จำนวนผู้เล่น, แล็บ, สถิติการแก้โจทย์)',
        responses: {
          200: { description: 'สำเร็จ' },
        },
      },
    },
    '/api/leaderboard/profile/{userId}': {
      get: {
        tags: ['Leaderboard'],
        summary: 'ดูโปรไฟล์สาธารณะของผู้เล่นคนอื่น',
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'สำเร็จ' },
          404: { description: 'ไม่พบผู้ใช้หรือบัญชีถูกระงับ' },
        },
      },
    },
    '/api/leaderboard/me': {
      get: {
        tags: ['Leaderboard'],
        summary: 'ดูสถิติและอันดับของตัวเอง',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'สำเร็จ' },
        },
      },
    },
    '/api/admin/stats': {
      get: {
        tags: ['Admin'],
        summary: 'สถิติรวมสำหรับ Admin Dashboard',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'สำเร็จ' },
          403: { description: 'เฉพาะ Admin' },
        },
      },
    },
    '/api/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'ค้นหาและดูรายชื่อผู้ใช้ทั้งหมดในระบบ',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'role', in: 'query', schema: { type: 'string', enum: ['USER', 'ADMIN'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
        ],
        responses: {
          200: { description: 'สำเร็จ' },
        },
      },
    },
    '/api/admin/users/{id}': {
      patch: {
        tags: ['Admin'],
        summary: 'ปรับเปลี่ยนสิทธิ์ (Role) หรือแบน/ปลดแบนผู้ใช้ (มีระบบป้องกันแบนตัวเอง)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  role: { type: 'string', enum: ['USER', 'ADMIN'] },
                  isBanned: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'อัปเดตสถานะสำเร็จ' },
          400: { description: 'ไม่อนุญาตให้แก้ไขสิทธิ์ของตัวเอง' },
        },
      },
    },
    '/api/admin/labs': {
      get: {
        tags: ['Admin'],
        summary: 'รายการแล็บทั้งหมดรวม Flag (Admin View)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'สำเร็จ (มี Flag)' },
        },
      },
    },
    '/api/admin/labs/{id}': {
      get: {
        tags: ['Admin'],
        summary: 'ดูรายละเอียดแล็บรายข้อรวม Flag (Admin View)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'สำเร็จ' },
        },
      },
    },
    '/api/admin/labs/{id}/solvers': {
      get: {
        tags: ['Admin'],
        summary: 'ดูรายชื่อผู้แก้แล็บนี้ได้ทั้งหมด เรียงตามเวลา',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'สำเร็จ' },
        },
      },
    },
    '/api/admin/labs/{id}/reset': {
      post: {
        tags: ['Admin'],
        summary: 'รีเซ็ตผลการแก้แล็บ (Admin View)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'สำเร็จ' },
        },
      },
    },
  },
};
