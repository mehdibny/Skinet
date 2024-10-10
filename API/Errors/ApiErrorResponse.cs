namespace API.Errors
{
    public class ApiErrorResponse(int statusCode, string message, string? detaills)
    {
        public int StatusCode { get; set; } = statusCode;
        public string Message { get; set; } = message;
        public string? Detaills { get; set; } = detaills;
    }
}
